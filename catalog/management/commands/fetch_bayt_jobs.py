# myapp/management/commands/fetch_bayt_jobs.py

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

from transformers import pipeline, logging as hf_logging
from catalog.models import JobField, JobPosting, Skill

# Quiet HuggingFace info/warnings
hf_logging.set_verbosity_error()


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
        # strip punctuation except + # . -
        w = re.sub(r"[^\w\s\+\#\.\-]", "", w)
        w = re.sub(r"\s{2,}", " ", w).strip()
        if w:
            cleaned.append(w)
    # dedupe, preserve casing
    seen = {}
    for w in cleaned:
        k = w.lower()
        if k not in seen:
            seen[k] = w
    return list(seen.values())


def parse_bayt_date(text: str):
    t = (text or "").strip().lower()
    m = re.match(r"(\d+)\s+day", t)
    if m:
        return (datetime.today() - timedelta(days=int(m.group(1)))).date()
    try:
        return datetime.strptime(text, "%b %d, %Y").date()
    except:
        return None


def extract_bullets(panel, heading_patterns):
    """Look for any of the headings, then pull <li> text under that section."""
    for pat in heading_patterns:
        hdr = panel.find("h3", string=re.compile(pat, re.I))
        if hdr:
            ul = hdr.find_next_sibling("ul")
            if ul:
                return [li.get_text(" ", strip=True) for li in ul.find_all("li")]
    return []


class Command(BaseCommand):
    help = "Scrapes Bayt.com via Selenium side-panel and saves to DB."

    def add_arguments(self, parser):
        parser.add_argument("-q", "--query", type=str, default="Software Engineer")
        parser.add_argument("-l", "--location", type=str, default="uae")
        parser.add_argument("-f", "--jobfield", type=str, default="Software Engineering")
        parser.add_argument("--max-jobs", type=int, default=20)

    def handle(self, *args, **opts):
        query = opts["query"]
        region = opts["location"]
        jobfield = opts["jobfield"]
        max_jobs = opts["max_jobs"]

        jf, _ = JobField.objects.get_or_create(name=jobfield)
        ner = pipeline("ner", model="dslim/bert-base-NER", grouped_entities=True)
        
        # Selenium / Edge setup
        EDGE_DRIVER = r"C:\Users\aurakcyber5\Downloads\edgedriver_win32\msedgedriver.exe"
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

        headings = [
            r"Skills",
            r"Essential",
            r"Desirable",
            r"Key Skills & Requirements",
        ]
        noise_re = re.compile(
            r"^(Unapply|Follow|Unfollow|Report|Print|Share|Email|Messenger|WhatsApp|X|Facebook)",
            re.I,
        )

        try:
            slug = query.lower().replace(" ", "-")
            url = f"https://www.bayt.com/en/{region}/jobs/{slug}-jobs/"
            driver.get(url)

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

                # --- meta
                title = gt(panel, "#jobViewJobTitle") or "N/A"
                company = gt(panel, ".toggle-head a.t-default")
                location = gt(panel, ".toggle-head .t-mute")
                raw_date = gt(panel, "#jb-widget-posted-date")
                posted_date = parse_bayt_date(raw_date)
                employment = gt(
                    panel,
                    "div[data-automation-id='id_type_level_experience'] .u-stretch",
                )
                industry = gt(
                    panel,
                    "div[data-automation-id='id_company_employees_industry'] .u-stretch",
                )

                # --- description
                desc_h3 = panel.find("h3", string=re.compile(r"Job Description", re.I))
                desc_html = ""
                if desc_h3:
                    for sib in desc_h3.find_next_siblings():
                        if sib.name == "h3":
                            break
                        desc_html += str(sib)
                cleaned_desc = BeautifulSoup(desc_html, "html.parser").get_text(
                    "\n\n", strip=True
                )

                # --- bullets
                bullets = extract_bullets(panel, headings)

                if not bullets:
                    # fallback: any <li> under Skills
                    skills_h3 = panel.find("h3", string=re.compile(r"Skills", re.I))
                    lines = []
                    if skills_h3:
                        for sib in skills_h3.find_next_siblings():
                            if sib.name == "h3":
                                break
                            for li in sib.find_all("li"):
                                text = li.get_text(" ", strip=True)
                                if text and not noise_re.search(text):
                                    lines.append(text)
                    bullets = lines

                # final NER fallback only if still empty
                ner_list = []
                if not bullets:
                    ents = ner(cleaned_desc)
                    ner_list = clean_ner_entities(ents)
                    bullets = ner_list

                # --- OUTPUT
                self.stdout.write(f"\n--- Job Card #{idx} ---")
                self.stdout.write(f"Title:      {title}")
                self.stdout.write(f"Company:    {company}")
                self.stdout.write(f"Location:   {location}")
                self.stdout.write(
                    f"Posted:     {posted_date or 'Unknown'}"
                )
                self.stdout.write(f"Employment: {employment}")
                self.stdout.write(f"Industry:   {industry}\n")

                self.stdout.write("Description:")
                for para in cleaned_desc.split("\n\n"):
                    self.stdout.write(para + "\n")

                self.stdout.write("Skills Section:")
                for b in bullets:
                    self.stdout.write(f" • {b}")

                self.stdout.write(f"\nNER → {bullets}\n" + "-" * 80)

                scraped.append(
                    {
                        "title": title,
                        "company": company,
                        "location": location,
                        "date_posted": posted_date,
                        "employment": employment,
                        "industry": industry,
                        "raw_html": desc_html,
                        "cleaned_description": cleaned_desc,
                        "skills": bullets,
                    }
                )

                time.sleep(random.uniform(1, 2))

            # --- SAVE
            if input("\nSave these to the database? (y/N): ").strip().lower() == "y":
                cnt = 0
                for job in scraped:
                    # dedupe by title + company
                    if JobPosting.objects.filter(
                        title=job["title"], company_name=job["company"]
                    ).exists():
                        continue

                    jp = JobPosting.objects.create(
                        title=job["title"],
                        company_name=job["company"],
                        location=job["location"],
                        job_field=jf,
                        raw_description=job["raw_html"] or job["title"],
                        cleaned_description=job["cleaned_description"],
                        date_posted=job["date_posted"],
                    )
                    for sk in job["skills"]:
                        so, _ = Skill.objects.get_or_create(name=sk)
                        jp.skills.add(so)
                    jp.save()
                    cnt += 1

                self.stdout.write(self.style.SUCCESS(f"✅ Saved {cnt} new postings."))
            else:
                self.stdout.write("Aborted: no postings saved.")

        finally:
            driver.quit()
