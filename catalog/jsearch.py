# catalog/jsearch.py
"""
Live job postings from the JSearch API (RapidAPI), which aggregates Google for Jobs:
LinkedIn, Indeed, Bayt, GulfTalent, company career pages and more.

search() is the only function that touches the network; the rest are pure helpers
(parse a result, work out the posted date, find known skills in a description).
"""
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta

API_URL = "https://jsearch.p.rapidapi.com/search-v2"
API_HOST = "jsearch.p.rapidapi.com"
MAX_SKILLS_PER_JOB = 25


class JSearchError(Exception):
    pass


def search(query: str, api_key: str, country: str = "ae", pages: int = 1, date_posted: str = "month") -> list[dict]:
    """One API request per page. Returns the raw job dicts."""
    params = urllib.parse.urlencode({
        "query": query, "country": country, "language": "en",
        "num_pages": str(pages), "date_posted": date_posted,
    })
    req = urllib.request.Request(f"{API_URL}?{params}", headers={"x-rapidapi-key": api_key, "x-rapidapi-host": API_HOST})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            payload = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise JSearchError(f"JSearch returned {e.code}: {e.read()[:200].decode(errors='ignore')}") from e
    except urllib.error.URLError as e:
        raise JSearchError(f"Could not reach JSearch: {e.reason}") from e
    except TimeoutError as e:
        raise JSearchError("JSearch took too long to answer; try again later") from e
    data = payload.get("data") or {}
    return data.get("jobs", []) if isinstance(data, dict) else data


_RELATIVE = re.compile(r"(\d+)\s*\+?\s*(minute|hour|day|week|month)s?\s+ago", re.I)


def posted_date(job: dict, today: date | None = None) -> date | None:
    """Exact UTC timestamp when JSearch has one, else the "3 days ago" text."""
    today = today or date.today()
    stamp = job.get("job_posted_at_datetime_utc")
    if stamp:
        try:
            return datetime.fromisoformat(stamp.replace("Z", "+00:00")).date()
        except ValueError:
            pass
    text = (job.get("job_posted_at") or "").lower()
    if "just" in text or "today" in text:
        return today
    m = _RELATIVE.search(text)
    if not m:
        return None
    n, unit = int(m.group(1)), m.group(2).lower()
    days = {"minute": 0, "hour": 0, "day": n, "week": 7 * n, "month": 30 * n}[unit]
    return today - timedelta(days=days)


def clean_location(job: dict) -> str:
    """JSearch appends "• via LinkedIn" to the location text; keep only the place."""
    parts = [job.get("job_city"), job.get("job_state"), job.get("job_country")]
    if any(parts):
        return ", ".join(dict.fromkeys(p for p in parts if p))
    return (job.get("job_location") or "").split("•")[0].strip()


def to_posting(job: dict, today: date | None = None) -> dict | None:
    """Map one API job to JobPosting field values. None when it lacks the basics."""
    if not job.get("job_id") or not job.get("job_title"):
        return None
    return {
        "external_id": job["job_id"][:500],
        "title": job["job_title"][:200],
        "company_name": (job.get("employer_name") or "")[:200],
        "location": clean_location(job)[:200],
        "source": (job.get("job_publisher") or "")[:100],
        "url": (job.get("job_apply_link") or job.get("job_google_link") or "")[:1000],
        "date_posted": posted_date(job, today),
        "raw_description": job.get("job_description") or "",
    }


# single words that appear in nearly every posting and say nothing about the job
GENERIC = {
    "technical", "technology", "engineering", "analysis", "organization", "planning", "management",
    "design", "development", "research", "business", "data", "systems", "operations", "support",
    "quality", "safety", "science", "marketing", "finance", "communication skills", "skills",
}


def build_skill_index(skills: list[tuple[int, str]]) -> list[tuple[int, re.Pattern]]:
    """Compile one whole-word pattern per usable skill name (skips fragments, HTML, generic words
    and case-duplicates; on a duplicate the first id wins, so pass preferred skills first)."""
    index, seen = [], set()
    for sid, name in skills:
        n = re.sub(r"\s+", " ", (name or "").strip().lower())
        key = re.sub(r" skills?$", "", n)  # "presentation skills" == "presentation"
        if key in seen or n in GENERIC:
            continue
        seen.add(key)
        if not (2 <= len(n) <= 40) or "<" in n or n.count(" ") > 3:
            continue
        if len(n) <= 3 and not re.search(r"[+#.]", n):  # short names only if code-like: c++, c#, .net
            if n not in {"sql", "aws", "gcp", "git", "php", "seo", "css", "api", "ux", "ui", "r"}:
                continue
        index.append((sid, re.compile(rf"(?<![\w+#.]){re.escape(n)}(?![\w+#])")))
    return index


def match_skills(text: str, index: list[tuple[int, re.Pattern]]) -> list[int]:
    """Skill ids whose name appears in the text, longest names first, capped."""
    t = (text or "").lower()
    hits = [(sid, p.pattern) for sid, p in index if p.search(t)]
    hits.sort(key=lambda h: -len(h[1]))
    return [sid for sid, _ in hits[:MAX_SKILLS_PER_JOB]]
