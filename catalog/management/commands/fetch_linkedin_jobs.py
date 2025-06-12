#!/usr/bin/env python
"""
Django management command to scrape LinkedIn job postings without login,
fetch full details, extract skills, and save to your models.

Dependencies:
  pip install requests beautifulsoup4 transformers
Usage:
  python manage.py fetch_linkedin_jobs \
    --query "Content Writer" \
    --location "United Arab Emirates" \
    --jobfield "Mass Communication" \
    --max-jobs 10
"""
import time
import re
import json
import requests
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from catalog.models import JobField, JobPosting, Skill
from transformers import pipeline
import html

# Browser-like headers
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/135.0.0.0 Safari/537.36"
)
# LinkedIn guest API endpoint for listings
LISTING_API = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"

# Initialize NER pipeline once (no grouping; we'll post-process)
NER_PIPELINE = pipeline(
    "ner",
    model="dslim/bert-base-NER",
    aggregation_strategy="simple"
)

# List of unwanted terms to filter out from extracted skill-like NER entities.
# You can extend this set with more terms you deem non-skills.
UNWANTED_TERMS = {
    # e.g. common company/location words you see incorrectly captured
    "united arab emirates", "abudhabi", "dubai", "uae", "middle east",
    # month/day terms that sometimes appear
    "january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december",
    # remove single common words if needed; adjust as you discover
    # ...
}

def fetch_listings(keywords, location, start=0):
    """
    Fetch up to ~25 job cards via LinkedIn guest API.
    Returns list of dicts {title, company_name, location, url}.
    Handles 429 on listing API gracefully.
    """
    params = {"keywords": keywords, "location": location, "start": start}
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"}
    try:
        response = requests.get(LISTING_API, params=params, headers=headers)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        if e.response is not None and e.response.status_code == 429:
            print(f"⚠️  Rate limited on listing API for keywords='{keywords}', start={start}. Skipping this batch.")
            return []
        raise
    soup = BeautifulSoup(response.text, "html.parser")
    cards = soup.select("div.base-card--link")
    results = []
    for card in cards:
        link = card.select_one("a.base-card__full-link")
        if not link or not link.has_attr("href"):
            continue
        url = link["href"].split('?')[0]
        title_el = card.select_one("h3.base-search-card__title")
        title = title_el.get_text(strip=True) if title_el else link.get_text(strip=True)
        comp_el = card.select_one("h4.base-search-card__subtitle")
        company = comp_el.get_text(strip=True) if comp_el else ''
        loc_el = card.select_one("span.job-search-card__location")
        loc = loc_el.get_text(strip=True) if loc_el else ''
        results.append({"title": title, "company_name": company, "location": loc, "url": url})
    return results

def fetch_detail_page(url):
    """
    Fetch full job detail HTML, retry on 429 errors.
    Returns HTML string or raises.
    """
    for _ in range(3):
        r = requests.get(url, headers={"User-Agent": USER_AGENT})
        if r.status_code == 429:
            time.sleep(5)
            continue
        r.raise_for_status()
        return r.text
    raise requests.exceptions.HTTPError(f"429 Too many requests: {url}")

def parse_relative_date_text(text):
    """
    Parse relative date text like "Posted 3 days ago" or Arabic "قبل ٤ أسبوع".
    Returns date object or None.
    """
    txt = text.strip().lower()
    # English patterns
    if txt in ("just now", "posted today", "today"):
        return datetime.today().date()
    m = re.match(r"(\d+)\s+(day|days|week|weeks|month|months)\s+ago", txt)
    if m:
        amount = int(m.group(1))
        unit = m.group(2)
        if "day" in unit:
            return (datetime.today() - timedelta(days=amount)).date()
        elif "week" in unit:
            return (datetime.today() - timedelta(weeks=amount)).date()
        elif "month" in unit:
            return (datetime.today() - timedelta(days=30 * amount)).date()
    # Arabic-like patterns: e.g., "قبل ٤ أسبوع" or "قبل 4 أسابيع"
    # Extract Arabic digits or Western digits
    m_ar = re.search(r"قبل\s*([0-9٠١٢٣٤٥٦٧٨٩]+)\s*(يوم|أيام|أسبوع|أسابيع|شهر|شهور)", text)
    if m_ar:
        num_text = m_ar.group(1)
        # convert Arabic-Indic digits to int if needed
        try:
            # replace Arabic numerals with Western if present
            arabic_digits = "٠١٢٣٤٥٦٧٨٩"
            translation = str.maketrans({d: str(i) for i, d in enumerate(arabic_digits)})
            num_norm = num_text.translate(translation)
            amount = int(num_norm)
        except:
            amount = None
        unit_ar = m_ar.group(2)
        if amount is not None:
            if "يوم" in unit_ar:
                return (datetime.today() - timedelta(days=amount)).date()
            elif "أسبوع" in unit_ar:
                return (datetime.today() - timedelta(weeks=amount)).date()
            elif "شهر" in unit_ar:
                return (datetime.today() - timedelta(days=30 * amount)).date()
    return None

def clean_ner_entities(ner_outputs: list[dict]) -> list[str]:
    """
    Post-process HuggingFace NER output into a clean list of skill names.
    - Drop tokens that start with '##' (subword fragments).
    - Discard 1–2 letter tokens unless explicitly allowed.
    - Remove stray punctuation (keep alphanumeric, +, #, ., -, and spaces).
    - Deduplicate case-insensitively but preserve original casing for first occurrence.
    - Filter out unwanted terms (from UNWANTED_TERMS) by whole-word match.
    """
    ALLOWED_SHORT = {"c", "r", "ai", "go", "js"}
    cleaned = []
    for ent in ner_outputs:
        word = ent.get("word", "").strip()
        if not word:
            continue
        # 1) Drop subword fragments
        if word.startswith("##"):
            continue
        lower_word = word.lower()
        # 2) Drop 1–2 char tokens unless allowed
        if len(lower_word) < 3 and lower_word not in ALLOWED_SHORT:
            continue
        # 3) Remove stray punctuation except allowed ones
        cleaned_word = re.sub(r"[^\w\s\+\#\.\-]", "", word)
        # 4) Collapse whitespace
        cleaned_word = re.sub(r"\s{2,}", " ", cleaned_word).strip()
        if not cleaned_word:
            continue
        # 5) Filter out unwanted by exact lower-word match or if full phrase matches unwanted
        lw = cleaned_word.lower()
        # check if any unwanted term equals this or contained wholly:
        if lw in UNWANTED_TERMS:
            continue
        # e.g., if unwanted term is multiple words, skip if cleaned_word equals it
        # We do not drop if cleaned_word contains unwanted term as substring within a larger word, 
        # but you may adjust here if desired.
        cleaned.append(cleaned_word)
    # Deduplicate case-insensitive
    seen = {}
    for w in cleaned:
        key = w.lower()
        if key not in seen:
            seen[key] = w
    return list(seen.values())

class Command(BaseCommand):
    help = "Fetch LinkedIn job postings and extract skills via NER, with full description extraction."
    def add_arguments(self, parser):
        parser.add_argument(
            "--query", "-q", type=str, default="Software Engineer",
            help="Search keywords"
        )
        parser.add_argument(
            "--location", "-l", type=str, default="United Arab Emirates",
            help="Job location filter"
        )
        parser.add_argument(
            "--jobfield", "-j", type=str, default="Software Engineering",
            help="JobField name in DB"
        )
        parser.add_argument(
            "--max-jobs", "-m", type=int, default=50,
            help="Max postings to fetch"
        )

    def handle(self, *args, **options):
        query = options["query"]
        location = options["location"]
        field_name = options["jobfield"]
        max_jobs = options["max_jobs"]

        job_field, _ = JobField.objects.get_or_create(name=field_name)

        # 1) Collect listings in batches of 25
        listings = []
        for start in range(0, max_jobs, 25):
            batch = fetch_listings(query, location, start)
            if not batch:
                break
            listings.extend(batch)
            if len(listings) >= max_jobs:
                break
            time.sleep(1)

        total = min(len(listings), max_jobs)
        self.stdout.write(self.style.SUCCESS(
            f"🔍 Fetched {total} listings for '{query}' in '{location}'"
        ))

        # 2) Display summary
        if total:
            self.stdout.write("\nListings:")
            for idx, job in enumerate(listings[:total], start=1):
                self.stdout.write(
                    f" {idx}. {job['title']} at {job['company_name']} ({job['location']})\n    {job['url']}"
                )
        else:
            self.stdout.write(self.style.WARNING("No listings found."))
            return

        # 3) Preview each: fetch details and show date, skills, cleaned description
        preview_data = []
        ner = NER_PIPELINE
        for idx, job in enumerate(listings[:total], start=1):
            url = job['url']
            # Skip existing in DB if desired for preview? We'll preview anyway.
            try:
                page_html = fetch_detail_page(url)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"[{idx}] ⚠️ Skip fetch detail {url}: {e}"))
                preview_data.append({
                    "index": idx,
                    "url": url,
                    "date": None,
                    "skills": [],
                    "cleaned_description": "",
                    "raw_html": ""
                })
                continue

            soup = BeautifulSoup(page_html, 'html.parser')

            # 3a) Try to extract JSON-LD JobPosting if present
            json_ld = None
            for script in soup.select('script[type="application/ld+json"]'):
                try:
                    data = json.loads(script.string or "{}")
                except json.JSONDecodeError:
                    continue
                # Some pages wrap as a list
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get("@type") == "JobPosting":
                            json_ld = item
                            break
                    if json_ld:
                        break
                elif isinstance(data, dict) and data.get("@type") == "JobPosting":
                    json_ld = data
                    break

            # 3b) Extract raw_description_html and cleaned text
            raw_html_snippet = ""
            cleaned_text = ""
            date_posted = None

            if json_ld:
                # Raw HTML description from JSON-LD (it may contain HTML tags)
                desc_html = json_ld.get("description", "")
                raw_html_snippet = desc_html
                # 1) Unescape any HTML entities
                desc_html = html.unescape(desc_html)
                # 2) Strip out all tags, collapse to text
                cleaned_text = BeautifulSoup(desc_html, "html.parser") \
                                .get_text(separator="\n") \
                                .strip()
                # DatePosted ISO
                date_iso = json_ld.get("datePosted")
                if date_iso:
                    try:
                        # ISO format: "2025-05-13T13:01:36.000Z"
                        dt = datetime.fromisoformat(date_iso.replace("Z", "+00:00"))
                        date_posted = dt.date()
                    except Exception:
                        date_posted = None
            # Fallback if JSON-LD missing or incomplete:
            if not raw_html_snippet:
                # Look for full job description container
                desc_div = (
                    soup.select_one('div.show-more-less-html__markup') or
                    soup.select_one('div.jobs-description__content') or
                    soup.select_one('section.description') or
                    None
                )
                if desc_div:
                    raw_html_snippet = str(desc_div)
                    # use .get_text() directly so no tags slip through
                    cleaned_text = desc_div.get_text(separator="\n").strip()
                else:
                    raw_html_snippet = ""
                    cleaned_text = ""

            # 3c) Extract date if not from JSON-LD: look for <time datetime>, or text “قبل X أسبوع”
            if date_posted is None:
                # Try <time datetime="">
                time_tag = soup.select_one("time[datetime]")
                if time_tag and time_tag.has_attr("datetime"):
                    try:
                        date_posted = datetime.fromisoformat(time_tag["datetime"]).date()
                    except Exception:
                        # fallback to relative text
                        rel = time_tag.get_text(strip=True)
                        date_posted = parse_relative_date_text(rel)
                else:
                    # Try span with "posted" patterns
                    rel_elem = soup.find(lambda tag: tag.name in ("span", "time") and "ago" in (tag.get_text("") or "").lower())
                    if rel_elem:
                        date_posted = parse_relative_date_text(rel_elem.get_text(strip=True))
            
            # 3d) First try to pick up an explicit “Skills” (or “Requirements”) section…
            skills = []
            header = soup.find(
                lambda tag: tag.name in ("strong", "h3", "h4", "p")
                            and any(kw in tag.get_text(strip=True).lower() 
                                    for kw in ("skill", "requirement", "qualification"))
            )
            if header:
                # look for a following <ul> of bullets
                ul = header.find_next_sibling("ul")
                if ul:
                    skills = [li.get_text(strip=True) for li in ul.find_all("li")]
                else:
                    # or maybe comma-separated on the same line
                    after = header.get_text(separator=" ").split(":", 1)[-1]
                    skills = [s.strip() for s in after.split(",") if s.strip()]
            else:
                # fallback to your NER pipeline
                text_for_nlp = re.sub(r"[^\w\s\+\#\.\-]", " ",
                                    cleaned_text.replace("\n", " "))
                text_for_nlp = re.sub(r"\s{2,}", " ", text_for_nlp).strip()
                entities = ner(text_for_nlp) if text_for_nlp else []
                skills = clean_ner_entities(entities)

            preview_data.append({
                "index": idx,
                "url": url,
                "date": date_posted,
                "skills": skills,
                "cleaned_description": cleaned_text,
                "raw_html": raw_html_snippet
            })

        # 4) Print preview
        self.stdout.write("\nPreview details:")
        for item in preview_data:
            idx = item["index"]
            date_str = item["date"].isoformat() if item["date"] else "Unknown"
            skills_str = ", ".join(item["skills"]) if item["skills"] else "None"
            self.stdout.write(f" [{idx}] Date: {date_str} | Skills: {skills_str}")
            # Print cleaned description with indentation
            desc = item["cleaned_description"]
            if desc:
                self.stdout.write("    Description:")
                for line in desc.splitlines():
                    line = line.strip()
                    if line:
                        self.stdout.write(f"      {line}")
            else:
                self.stdout.write("    Description: <empty>")

        # 5) Ask user whether to persist to DB
        answer = input(f"\nSave these {len(preview_data)} postings? [Y/n]: ")
        if answer.strip().lower() not in ('y', 'yes', ''):
            self.stdout.write(self.style.WARNING("Aborted by user."))
            return

        # 6) Save to DB
        saved = 0
        for item, job in zip(preview_data, listings[:total]):
            url = job['url']
            # Avoid duplicates by raw_description matching URL or raw_html?
            # Here we check URL; raw_description in DB was previously URL or HTML snippet.
            if JobPosting.objects.filter(raw_description=url).exists():
                continue
            # Create posting
            flat_desc = item["cleaned_description"].replace("\n", " ")
            posting = JobPosting.objects.create(
                title=job['title'],
                company_name=job['company_name'],
                job_field=job_field,
                location=job['location'],
                raw_description=item["raw_html"] or url,
                cleaned_description=flat_desc,
                date_posted=item["date"]
            )
            MAX_LEN = Skill._meta.get_field("name").max_length
            for raw in item["skills"]:
                raw = raw.strip()
                # 1) Split on delimiters looking for a short chunk
                parts = re.split(r"[\/\-\&]| and |, ", raw)
                for candidate in parts:
                    candidate = candidate.strip()
                    if candidate and len(candidate) <= MAX_LEN:
                        name = candidate
                        break
                else:
                    # 2) If nothing fits, truncate at a word boundary
                    name = raw[:MAX_LEN].rsplit(" ", 1)[0]

                skill_obj, _ = Skill.objects.get_or_create(name=name)
                posting.skills.add(skill_obj)

            saved += 1
        self.stdout.write(self.style.SUCCESS(f"💾 Saved {saved} postings."))

