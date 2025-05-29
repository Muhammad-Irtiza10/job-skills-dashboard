# backend/extract_catalog.py
#!/usr/bin/env python
"""
Usage:
  # 1) First run (no skill list yet) → prints RAKE suggestions
  python backend/extract_catalog.py "docs/...Public Relations.pdf"

  # 2) After you curate skill_lists/...Public Relations.txt:
  #    preview matches
  python backend/extract_catalog.py "docs/...Public Relations.pdf"
  
  # 3) Once you’re happy, persist to DB (dept, desc, skills)
  python backend/extract_catalog.py "docs/...Public Relations.pdf" --save
"""
import os
import re
import sys
import argparse
import textwrap
from pathlib import Path

# ensure punkt_tab is available for RAKE
import nltk
try:
    nltk.data.find("tokenizers/punkt_tab/english")
except LookupError:
    nltk.download("punkt_tab")

# ─── Make sure the project root is on Python’s import path ─────────
PROJECT_ROOT = Path(__file__).resolve().parents[1]  # one level up from backend/
sys.path.insert(0, str(PROJECT_ROOT))


# ─── 0) setup Django if saving ──────────────────────────────────────────────
SAVE = "--save" in sys.argv
if SAVE:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "skillgap_project.settings")
    import django

    django.setup()
    from catalog.models import Major, Skill

# ─── 1) CLI args ──────────────────────────────────────────────────────────────
p = argparse.ArgumentParser(description="Extract and optionally save a catalog’s header & skills")
p.add_argument("pdf",       type=Path,           help="Path to catalog PDF")
p.add_argument("--save",    action="store_true", help="Write dept, desc & skills into DB")
p.add_argument("--major-name", help="Override Major name (defaults to PDF stem)")
args = p.parse_args()

PDF = args.pdf
if not PDF.exists():
    sys.exit(f"❌  {PDF} not found")

MAJOR_NAME = args.major_name or PDF.stem

# ─── 2) Header extraction helpers ─────────────────────────────────────────────
import fitz  # PyMuPDF

def extract_header_text(path: Path, y_threshold: float = 150.0) -> list[str]:
    """
    Read only the first page’s text blocks whose top y0 < y_threshold,
    drop any that look like page-footers, sort top→bottom, and return
    each block’s text as its own “line.”
    """
    blocks = []
    with fitz.open(path) as doc:
        first_page = doc[0]
        for blk in first_page.get_text("blocks"):
            x0, y0, x1, y1, txt = blk[:5]
            if y0 < y_threshold:
                # skip footers like "76 | Page"
                if re.match(r'^\d+\s*\|\s*Page', txt.strip(), re.IGNORECASE):
                    continue
                blocks.append((y0, txt.strip()))
    # sort top to bottom
    blocks.sort(key=lambda b: b[0])
    # return only the text lines
    return [text for _, text in blocks]

def parse_header(lines: list[str], max_sents: int = 2) -> tuple[str,str]:
    """
    lines[0] = department
    lines[1] = major title (skip)
    lines[2:] = description → join & truncate to max_sents sentences
    """
    if len(lines) < 3:
        return "", ""
    department = lines[0]
    desc_src   = " ".join(lines[2:])
    # split on sentence boundaries
    sents = re.split(r'(?<=[\.!?])\s+', desc_src)
    description = " ".join(sents[:max_sents]).strip()
    description = re.sub(r'\s+', " ", description)
    return department, description

# ─── 3) Skill extraction & RAKE suggestions ─────────────────────────────────
import spacy
from spacy.matcher import PhraseMatcher

def extract_text(path: Path) -> str:
    txt = ""
    with fitz.open(path) as doc:
        for page in doc:
            txt += page.get_text("text")
    # collapse whitespace & de-hyphen
    txt = re.sub(r"\s+", " ", txt)
    txt = re.sub(r"([a-z])[-–—]([a-z])", r"\1 \2", txt, flags=re.I)
    return txt

def rake_suggestions(text: str, top_n: int = 50) -> list[str]:
    from rake_nltk import Rake
    import nltk

    # ensure stopwords present
    nltk.download("stopwords", quiet=True)
    r = Rake(max_length=5, min_length=1)
    r.extract_keywords_from_text(text)
    raw = r.get_ranked_phrases()
    # simple filter: 1–4 words, no digits or boilerplate
    cand = [p.lower() for p in raw
            if 1 <= len(p.split()) <= 4
            and not re.search(r"\d|course|degree|requirements?|elective|concentration", p)]
    return cand[:top_n]

# ─── 4) Locate or init skill list ──────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR     = PROJECT_ROOT / "skill_lists"
SKILL_DIR.mkdir(exist_ok=True)

skill_file = SKILL_DIR / f"{PDF.stem}.txt"
text       = extract_text(PDF)

if not skill_file.exists():
    # first pass → RAKE suggestions & exit
    print(f"🛈  {skill_file} not found – generating RAKE suggestions…\n")
    sugg = rake_suggestions(text, top_n=200)
    print(textwrap.fill(", ".join(sugg), 100))
    print(f"\n👉  Copy the good ones into {skill_file} (one per line) and rerun.")
    sys.exit(0)

SKILL_TERMS = [line.strip().lower() for line in skill_file.read_text().splitlines() if line.strip()]

# ─── 5) PhraseMatcher against curated list ────────────────────────────────────
nlp     = spacy.load("en_core_web_sm")
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
patterns = [nlp.make_doc(s) for s in SKILL_TERMS]
matcher.add("SKILLS", patterns)

doc   = nlp(text)
found = {doc[start:end].text.lower() for _, start, end in matcher(doc)}

# ↘––– DEBUG: which curated terms didn’t match? –––––––––––––––––––––––––––––––
missing = set(SKILL_TERMS) - found

# —––– FUZZY‐FALLBACK: all words present anywhere? —––––––––––––––––––––––
for term in missing.copy():
    words = term.split()
    if all(re.search(rf'\b{re.escape(w)}\b', text, re.IGNORECASE) for w in words):
        found.add(term)
        missing.remove(term)
        print(f"➕  Fallback-matched by all-words-present: {term}")

print(f"\n✅  {len(found)} skills found in «{PDF.name}»:")
print(textwrap.fill(", ".join(sorted(found)), 100))

# ─── 6) If --save, persist dept/desc & skills to Django ───────────────────────
if SAVE:
    # 1) Extract the top-of-page blocks
    header_lines = extract_header_text(PDF, y_threshold=150.0)

    # 2) If the 3rd line reads “Program Description”, drop it
    if len(header_lines) > 2 and re.fullmatch(r'program description', header_lines[2], re.IGNORECASE):
        header_lines.pop(2)

    # 3) Parse department & description from the cleaned list
    dept, desc = parse_header(header_lines)

    # 4) Persist to Django
    major, _ = Major.objects.get_or_create(name=MAJOR_NAME)
    major.department  = dept
    major.description = desc
    major.save()
    print(f"\n🔖  Saved header → Department: {dept!r}, Description: {desc!r}")

    # 5) Update skills
    major.skills.clear()
    for sk in sorted(found):
        skill_obj, _ = Skill.objects.get_or_create(name=sk)
        major.skills.add(skill_obj)
    print(f"💾  Saved {len(found)} skills under Major «{major.name}» (id={major.id})")

