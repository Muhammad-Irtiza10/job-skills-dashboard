# catalog/management/commands/classify_skills.py
"""
Sort skills into major / technical / soft with a local Ollama model.

Step 1 (default): writes a review CSV, database untouched.
    python manage.py classify_skills --out skill_categories.csv
Step 2 (after review): apply the CSV to the database.
    python manage.py classify_skills --apply skill_categories.csv

Soft skills are matched against a fixed word list first; the model only sees the rest.
Rows the model marks "junk" (fragments that are not skills) are left as they are and
only reported, never deleted.
"""
import csv
import json
import re
import urllib.request
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from catalog.models import Skill

SOFT_WORDS = {
    "communication", "teamwork", "team work", "collaboration", "leadership", "time management",
    "problem solving", "problem-solving", "critical thinking", "creativity", "adaptability",
    "flexibility", "negotiation", "presentation", "public speaking", "interpersonal", "empathy",
    "conflict resolution", "decision making", "decision-making", "attention to detail", "work ethic",
    "self-motivated", "motivation", "organization", "organisational", "organizational", "multitasking",
    "emotional intelligence", "customer service", "listening", "storytelling", "mentoring", "coaching",
    "accountability", "initiative", "resilience", "stakeholder management", "networking",
    "analytical thinking", "logical reasoning", "persuasion", "collaborative", "team player",
    "professional presentation", "presentation", "communication skills", "verbal communication",
    "written communication", "oral communication", "active listening", "self-management",
    "professionalism", "integrity", "reliability", "patience", "curiosity", "open-mindedness",
    "cultural awareness", "intercultural communication", "teamwork and collaboration", "planning",
    "prioritization", "stress management", "self-discipline", "positive attitude", "proactive",
}
# language ability counts as soft: "English speaking", "arabic writing", ...
LANGUAGE_SKILL = re.compile(r"^(english|arabic|french|hindi|urdu|spanish|german|chinese)\s+(speaking|writing|reading|listening)$")

PROMPT = """You sort items from a university career app's skill list into exactly one category.
- "technical": a concrete tool, programming language, software, framework, platform, lab technique,
  standard, or hands-on production method (e.g. Python, AutoCAD, Excel, SQL, PCR, Docker, AWS, Revit,
  Power BI, video editing, photo editing, graphic design).
- "major": academic subject knowledge, theory or a professional practice area of the field
  (e.g. thermodynamics, data structures, marketing strategy, cell biology, financial accounting,
  communication theory, mass communication, media ethics, social media strategy, journalism,
  public relations, research methods, project management, crisis communication).
- "junk": not a skill at all: broken fragments, HTML, course codes, organisation names, filler words
  (e.g. "univ 100", "mass mailing </ li", "US News & World Report", "life students", "GCP)").

Answer with JSON only, mapping each number to its category, like {{"1": "technical", "2": "major"}}.

Items:
{items}"""

VALID = {"major", "technical", "soft", "junk"}
MODEL_CHOICES = {"major", "technical", "junk"}  # soft comes only from the word list above


def is_soft(name: str) -> bool:
    # exact match only ("Teamwork", "leadership skills"); anything longer goes to the model
    n = re.sub(r"\s+skills?$", "", name.lower().strip())
    return n in SOFT_WORDS or bool(LANGUAGE_SKILL.match(n))


def ask_ollama(model: str, names: list[str], url: str) -> dict:
    items = "\n".join(f"{i + 1}. {n}" for i, n in enumerate(names))
    body = json.dumps({
        "model": model, "prompt": PROMPT.format(items=items), "format": "json",
        "stream": False, "options": {"temperature": 0},
    }).encode()
    req = urllib.request.Request(f"{url}/api/generate", body, {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        raw = json.loads(r.read())["response"]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


class Command(BaseCommand):
    help = "Sort skills into major / technical / soft with Ollama (review CSV first, then --apply)."

    def add_arguments(self, parser):
        parser.add_argument("--out", default="skill_categories.csv")
        parser.add_argument("--apply", metavar="CSV", help="apply a reviewed CSV to the database")
        parser.add_argument("--model", default="qwen2.5:3b")
        parser.add_argument("--url", default="http://127.0.0.1:11434")
        parser.add_argument("--batch", type=int, default=30)
        parser.add_argument("--all", action="store_true", help="include skills not linked to any major or job")
        parser.add_argument("--limit", type=int, default=0, help="only the first N skills (for a trial run)")

    def handle(self, *args, **o):
        if o["apply"]:
            return self.apply(Path(o["apply"]))

        qs = Skill.objects.all().order_by("id")
        if not o["all"]:
            qs = qs.filter(Q(majors__isnull=False) | Q(job_postings__isnull=False)).distinct()
        skills = list(qs.values_list("id", "name"))
        if o["limit"]:
            skills = skills[: o["limit"]]

        out = Path(o["out"])
        done = {}
        if out.exists():  # resume an interrupted run
            with out.open(encoding="utf-8", newline="") as f:
                done = {int(r["id"]): r for r in csv.DictReader(f)}
        rows = dict(done)
        todo = [(i, n) for i, n in skills if i not in done]
        self.stdout.write(f"{len(skills)} skills, {len(done)} already sorted, {len(todo)} to go")

        for i, n in todo:
            if is_soft(n):
                rows[i] = {"id": i, "name": n, "category": "soft", "by": "word-list"}
        model_todo = [(i, n) for i, n in todo if i not in rows]

        for b in range(0, len(model_todo), o["batch"]):
            chunk = model_todo[b : b + o["batch"]]
            answer = ask_ollama(o["model"], [n for _, n in chunk], o["url"])
            for k, (i, n) in enumerate(chunk):
                cat = str(answer.get(str(k + 1), "")).lower().strip()
                ok = cat in MODEL_CHOICES
                rows[i] = {"id": i, "name": n, "category": cat if ok else "major",
                           "by": o["model"] if ok else "default"}
            self.write(out, rows)
            self.stdout.write(f"  {min(b + o['batch'], len(model_todo))}/{len(model_todo)}")

        self.write(out, rows)
        counts = {c: sum(1 for r in rows.values() if r["category"] == c) for c in sorted(VALID)}
        self.stdout.write(self.style.SUCCESS(f"Wrote {out} - {counts}. Database not changed."))

    @staticmethod
    def write(path: Path, rows: dict):
        with path.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["id", "name", "category", "by"])
            w.writeheader()
            w.writerows(rows[k] for k in sorted(rows))

    def apply(self, path: Path):
        if not path.exists():
            raise CommandError(f"File not found: {path}")
        with path.open(encoding="utf-8", newline="") as f:
            rows = [r for r in csv.DictReader(f) if r["category"] in {"major", "technical", "soft"}]
        changed = 0
        for cat in ("major", "technical", "soft"):
            ids = [int(r["id"]) for r in rows if r["category"] == cat]
            changed += Skill.objects.filter(id__in=ids).exclude(category=cat).update(category=cat)
        self.stdout.write(self.style.SUCCESS(f"Updated {changed} skills. Rows marked 'junk' were left unchanged."))
