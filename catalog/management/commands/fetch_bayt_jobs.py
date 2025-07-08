import time
import random
import re
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

from llama_cpp import Llama
from transformers import pipeline, logging as hf_logging
from catalog.models import JobField, JobPosting, Skill

# Quiet HuggingFace info/warnings
hf_logging.set_verbosity_error()

# Initialize local GGUF Llama model
llm = Llama(
    model_path=r"C:\Users\aurakcyber5\Downloads\mistral-7b-instruct-v0.2-dare.Q5_K_M.gguf",
    n_ctx=2048,
    verbose=False
)

def clean_ner_entities(ner_outputs: list[dict]) -> list[str]:
    ALLOWED_SHORT = {"c", "r", "ai", "go", "js"}
    cleaned = []
    for ent in ner_outputs:
        w = ent.get("word", "").strip()
        if not w or w.startswith("##"):
            continue
        lw = w.lower()
        if len(lw) < 3 and lw not in ALLOWED_SHORT:
            continue
        w = re.sub(r"[^\w\s\+\#\.\-]", "", w)
        w = re.sub(r"\s{2,}", " ", w).strip()
        if w:
            cleaned.append(w)
    seen = {}
    for w in cleaned:
        k = w.lower()
        if k not in seen:
            seen[k] = w
    return list(seen.values())


def refine_skills_llm(bullets: list[str]) -> list[str]:
    """
    Use the GGUF model to refine raw bullet list into
    a clean list of skill keywords.
    Handles comma-, newline-, and dash-separated output.
    """
    text = "\n".join(bullets)
    prompt = f"""You are a skills-extraction assistant.
Read the following Skills section and output ONLY comma-separated skill keywords, just give the texts only.
{text}
"""

    out = llm(
        prompt=prompt,
        max_tokens=128,
        temperature=0.0,
    )
    raw = out["choices"][0]["text"].strip()
    # Remove any “Skills:” or “Output:” prefix
    cleaned = re.sub(r'^(Skills:|Output:)\s*', '', raw, flags=re.IGNORECASE)

    # Split on commas or newlines
    parts = re.split(r"[,\n]+", cleaned)
    skills = []
    for part in parts:
        # strip leading hyphens, bullets, whitespace
        skill = re.sub(r'^[\-•\s]+', '', part).strip()
        if skill:
            skills.append(skill)
    return skills


def parse_bayt_date(text: str):
    """Parse Bayt's posted-date text into a date object."""
    t = (text or "").strip().lower()
    m = re.match(r"(\d+)\s+day", t)
    if m:
        return (datetime.today() - timedelta(days=int(m.group(1)))).date()
    try:
        return datetime.strptime(text, "%b %d, %Y").date()
    except:
        return None

def extract_bullets(panel, heading_patterns):
    for pat in heading_patterns:
        hdr = panel.find("h3", string=re.compile(pat, re.I))
        if hdr:
            ul = hdr.find_next_sibling("ul")
            if ul:
                return [li.get_text(" ", strip=True) for li in ul.find_all("li")]
    return []

class Command(BaseCommand):
    help = "Scrapes Bayt.com via Selenium side-panel and saves to DB, plus LLM-refined skills."

    def add_arguments(self, parser):
        parser.add_argument("-q", "--query", type=str, default="Software Engineer")
        parser.add_argument("-l", "--location", type=str, default="Uae")
        parser.add_argument("-f", "--jobfield", type=str, default="Software Engineering")
        parser.add_argument("--max-jobs", type=int, default=20)

    def handle(self, *args, **opts):
        query = opts["query"]
        region = opts["location"]
        jobfield = opts["jobfield"]
        max_jobs = opts["max_jobs"]

        jf, _ = JobField.objects.get_or_create(name=jobfield)
        ner = pipeline("ner", model="dslim/bert-base-NER", grouped_entities=True)

        EDGE_DRIVER = r"C:\Users\aurakcyber5\Documents\edgedriver_win32_\msedgedriver.exe"
        service = EdgeService(executable_path=EDGE_DRIVER)
        optsE = EdgeOptions()
        optsE.use_chromium = True
        optsE.add_argument(r"--user-data-dir=C:\Users\aurakcyber5\selenium-profile-seed")
        optsE.add_argument("--disable-gpu")
        optsE.add_argument("--window-size=1920,1080")
        driver = webdriver.Edge(service=service, options=optsE)

        def gt(panel, sel):
            el = panel.select_one(sel)
            return el.get_text(" · ", strip=True) if el else ""

        headings = [r"Skills", r"Essential", r"Desirable", r"Key Skills & Requirements"]
        DEMOG = re.compile(r"age|male|female|residing|national", flags=re.I)
        NON_SKILLS = re.compile(
            r"\b(abu dhabi|dubai|uae|national|male|female|\d{1,2}[\-–]\d{1,2} years?)\b",
            flags=re.I
        )

        try:
            slug = query.lower().replace(" ", "-")
            url = f"https://www.bayt.com/en/{region}/jobs/{slug}-jobs/"
            driver.get(url)

            # Extract the exact location text from the Bayt dropdown
            try:
                sel = Select(driver.find_element(By.ID, "search_country"))
                location_text = sel.first_selected_option.text
            except:
                location_text = region

            WebDriverWait(driver, 10).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "li[data-js-job]"))
            )
            cards = driver.find_elements(By.CSS_SELECTOR, "li[data-js-job]")[:max_jobs]
            self.stdout.write(f"→ Found {len(cards)} cards, clicking each…")

            scraped = []
            for idx, card in enumerate(cards, 1):
                driver.execute_script("arguments[0].scrollIntoView(true);", card)
                try:
                    card.click()
                except:
                    driver.execute_script("arguments[0].click();", card)

                try:
                    WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "#view_inner .card"))
                    )
                except:
                    self.stdout.write(f"⚠️  Skipping card #{idx}: no side panel")
                    continue

                time.sleep(1)
                soup = BeautifulSoup(driver.page_source, "html.parser")
                panel = soup.select_one("#view_inner .card")
                if not panel:
                    continue

                bullets = extract_bullets(panel, headings)
                bullets = [b for b in bullets if not DEMOG.search(b)]
                if not bullets:
                    ents = ner(panel.get_text(" ", strip=True))
                    bullets = clean_ner_entities(ents)

                raw_refined = refine_skills_llm(bullets)
                refined = [s for s in raw_refined if not NON_SKILLS.search(s)]

                self.stdout.write("\nRefined Skills:")
                for sk in refined:
                    self.stdout.write(f" • {sk}")

                scraped.append({
                    "title": gt(panel, "#jobViewJobTitle") or "N/A",
                    "company": gt(panel, ".toggle-head a.t-default"),
                    "location": location_text,
                    "date_posted": parse_bayt_date(gt(panel, "#jb-widget-posted-date")),
                    "employment": gt(panel, "div[data-automation-id='id_type_level_experience'] .u-stretch"),
                    "industry": gt(panel, "div[data-automation-id='id_company_employees_industry'] .u-stretch"),
                    "raw_html": str(panel),
                    "cleaned_description": BeautifulSoup(str(panel), "html.parser").get_text("\n\n", strip=True),
                    "skills": bullets,
                    "refined_skills": refined,
                })

                time.sleep(random.uniform(1, 2))

            if input("\nSave these to the database? (y/N): ").strip().lower() == "y":
                cnt = 0
                for job in scraped:
                    jp = JobPosting.objects.create(
                        title=job["title"],
                        company_name=job["company"],
                        location=job["location"],
                        job_field=jf,
                        raw_description=job["raw_html"],
                        cleaned_description=job["cleaned_description"],
                        date_posted=job["date_posted"],
                    )
                    for sk in job["refined_skills"]:
                        so, _ = Skill.objects.get_or_create(name=sk)
                        jp.skills.add(so)
                    jp.save()
                    cnt += 1

                self.stdout.write(self.style.SUCCESS(f"✅ Saved {cnt} new postings."))
            else:
                self.stdout.write("Aborted: no postings saved.")

        finally:
            driver.quit()
