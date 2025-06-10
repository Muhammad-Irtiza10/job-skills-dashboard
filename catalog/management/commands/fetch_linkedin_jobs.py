# myapp/management/commands/fetch_linkedin_jobs.py

import time
import random
import re
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from bs4 import BeautifulSoup

from transformers import pipeline  # HuggingFace NER

from catalog.models import JobField, JobPosting, Skill


def clean_ner_entities(ner_outputs: list[dict]) -> list[str]:
    """
    Post-process HuggingFace NER output into a clean list of skill names.
    - Drop tokens that start with '##' (subword fragments).
    - Discard 1–2 letter tokens unless explicitly allowed (e.g. "C", "R", "AI").
    - Remove stray punctuation (keep alphanumeric, +, #, ., -, and spaces).
    - Deduplicate case-insensitively but preserve original casing for first occurrence.
    """
    # Add any known 1–2 letter skill tokens you want to allow:
    ALLOWED_SHORT = {"c", "r", "ai", "go", "js"}

    cleaned = []
    for ent in ner_outputs:
        word = ent.get("word", "").strip()
        if not word:
            continue

        # 1) Drop any subword fragment
        if word.startswith("##"):
            continue

        lower_word = word.lower()
        # 2) Drop 1–2 char tokens unless in our allowed short set
        if len(lower_word) < 3 and lower_word not in ALLOWED_SHORT:
            continue

        # 3) Remove any stray punctuation, keeping letters, numbers, '+', '#', '.', '-', and spaces
        cleaned_word = re.sub(r"[^\w\s\+\#\.\-]", "", word)

        # 4) Collapse multiple spaces into one
        cleaned_word = re.sub(r"\s{2,}", " ", cleaned_word).strip()

        if cleaned_word:
            cleaned.append(cleaned_word)

    # 5) Deduplicate case-insensitive, preserving first-seen casing
    seen = {}
    for w in cleaned:
        key = w.lower()
        if key not in seen:
            seen[key] = w

    return list(seen.values())


def parse_linkedin_date(rel_text: str) -> datetime.date:
    """
    Convert LinkedIn’s “relative” posted dates into a date object.
    Examples:
      - "1 day ago", "3 days ago", "1 week ago", "2 months ago", "Just now", "Posted today"
    Returns a datetime.date or None if unparseable.
    """
    text = rel_text.strip().lower()

    if text in ("just now", "posted today", "today"):
        return datetime.today().date()

    m = re.match(r"(\d+)\s+(day|days|week|weeks|month|months)\s+ago", text)
    if m:
        amount = int(m.group(1))
        unit = m.group(2)
        if "day" in unit:
            return (datetime.today() - timedelta(days=amount)).date()
        elif "week" in unit:
            return (datetime.today() - timedelta(weeks=amount)).date()
        elif "month" in unit:
            return (datetime.today() - timedelta(days=30 * amount)).date()

    m2 = re.match(r"(\d+)\+\s+days\s+ago", text)
    if m2:
        amount = int(m2.group(1))
        return (datetime.today() - timedelta(days=amount)).date()

    return None


class Command(BaseCommand):
    help = (
        "Scrapes LinkedIn job postings using an already-logged-in Edge profile. "
        "Prints each posting’s cleaned skill list to the terminal, then asks whether to save to DB."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--query",
            type=str,
            default="Software Engineer",
            help="Job title/keywords to search for (e.g. 'Data Scientist')"
        )
        parser.add_argument(
            "--location",
            type=str,
            default="United Arab Emirates",
            help="Location string for the search (e.g. 'Dubai, UAE')"
        )
        parser.add_argument(
            "--jobfield",
            type=str,
            default="Software Engineering",
            help="Name of the JobField to associate these postings with"
        )
        parser.add_argument(
            "--max-jobs",
            type=int,
            default=10,
            help="Maximum number of job postings to scrape"
        )
        parser.add_argument(
            "--max_jobs",
            type=int,
            help="Alternate flag name for maximum number of job postings"
        )

    def handle(self, *args, **options):
        query = options["query"]
        location = options["location"]
        jobfield_name = options["jobfield"]

        # Accept either --max-jobs or --max_jobs
        max_jobs = options.get("max_jobs")
        if max_jobs is None:
            max_jobs = options.get("max-jobs", 10)

        # 1) Ensure a JobField exists (or create it)
        job_field_obj, _ = JobField.objects.get_or_create(name=jobfield_name)

        # 2) Path to your msedgedriver.exe
        EDGE_DRIVER_PATH = r"C:\Users\aurakcyber5\Downloads\edgedriver_win32\msedgedriver.exe"
        service = EdgeService(executable_path=EDGE_DRIVER_PATH)

        # 3) Build EdgeOptions to reuse the manually-logged-in profile
        edge_options = EdgeOptions()
        edge_options.use_chromium = True

        # ----- THESE TWO LINES MUST MATCH YOUR MANUAL LOGIN -----
        edge_options.add_argument(r"--user-data-dir=C:\Users\aurakcyber5\selenium-profile-seed")
        edge_options.add_argument(r"--profile-directory=SeleniumTest")
        # ---------------------------------------------------------

        edge_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        edge_options.add_experimental_option("useAutomationExtension", False)

        edge_options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0"
        )

        # OPTIONAL: run headless once verified
        # edge_options.add_argument("--headless")

        edge_options.add_argument("--disable-gpu")
        edge_options.add_argument("--window-size=1920,1080")

        driver = webdriver.Edge(service=service, options=edge_options)

        # === Initialize the HuggingFace NER pipeline once ===
        ner_pipeline = pipeline("ner", model="dslim/bert-base-NER", grouped_entities=True)

        try:
            # 4) Go to LinkedIn feed
            driver.get("https://www.linkedin.com/feed/")
            time.sleep(5)

            # If redirected to login, abort
            if "login" in driver.current_url.lower():
                self.stderr.write(
                    "ERROR: Selenium did not load your saved profile. Aborting."
                )
                return

            # 5) Navigate directly to Jobs page
            driver.get("https://www.linkedin.com/jobs")
            time.sleep(5)

            # 6) Fill in search filters
            keyword_input = driver.find_element(
                By.CSS_SELECTOR, "input[aria-label*='title, skill, or company']"
            )
            location_input = driver.find_element(
                By.CSS_SELECTOR, "input[aria-label*='City, state, or zip code']"
            )

            keyword_input.clear()
            keyword_input.send_keys(query)
            time.sleep(random.uniform(1, 2))

            location_input.clear()
            location_input.send_keys(location)
            time.sleep(random.uniform(1, 2))

            # Press Enter to apply filters
            location_input.send_keys(Keys.ENTER)
            time.sleep(5)

            #
            # 7) Scroll the job-list container until we have at least max_jobs URLs
            #
            job_urls = []
            max_scrolls = 30
            scroll_count = 0

            while len(job_urls) < max_jobs and scroll_count < max_scrolls:
                scroll_count += 1

                try:
                    # Find the little “scroll sentinel” above the <ul> in the left pane
                    sentinel = driver.find_element(
                        By.CSS_SELECTOR,
                        "div[data-results-list-top-scroll-sentinel]"
                    )
                    # Its parent <div> is the scrollable container
                    list_container = sentinel.find_element(By.XPATH, "./parent::div")
                except:
                    list_container = None

                if list_container:
                    driver.execute_script(
                        "arguments[0].scrollTop = arguments[0].scrollHeight", list_container
                    )
                else:
                    # Fallback: scroll the entire window if we can't find sentinel
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

                # Give LinkedIn a moment to append more cards
                time.sleep(1.5)

                # Re-collect all job-card links
                cards = driver.find_elements(By.CSS_SELECTOR, "a.job-card-container__link")
                unique_urls = []
                for c in cards:
                    href = c.get_attribute("href")
                    if href and href not in unique_urls:
                        unique_urls.append(href)

                job_urls = unique_urls[:max_jobs]

            #
            # 8) Loop over each collected job_url
            #
            scraped_jobs = []
            scraped_count = 0

            for job_url in job_urls:
                # Skip if already in DB
                if JobPosting.objects.filter(raw_description=job_url).exists():
                    continue

                driver.get(job_url)
                time.sleep(3)

                page_html = driver.page_source
                soup = BeautifulSoup(page_html, "html.parser")

                # 9) Extract posted date
                time_tag = soup.select_one("time[datetime]")
                if time_tag and time_tag.has_attr("datetime"):
                    try:
                        posted_date = datetime.fromisoformat(time_tag["datetime"]).date()
                    except ValueError:
                        posted_date = parse_linkedin_date(time_tag.get_text(strip=True))
                else:
                    rel_time_elem = (
                        soup.select_one("time")
                        or soup.find("span", string=re.compile(r"\d+\s+(day|week|month)"))
                    )
                    if rel_time_elem:
                        rel_text = rel_time_elem.get_text(strip=True)
                        posted_date = parse_linkedin_date(rel_text)
                    else:
                        posted_date = None

                # 10) Extract job title
                title_elem = (
                    soup.select_one("h1.topcard__title")
                    or soup.select_one("h1.top-card-layout__title")
                    or soup.find("h1")
                )
                job_title = title_elem.get_text(strip=True) if title_elem else "N/A"

                # 11) Extract raw & cleaned job description
                desc_div = (
                    soup.select_one("div.show-more-less-html__markup")
                    or soup.select_one("div.jobs-description__content")
                )
                raw_html = str(desc_div) if desc_div else ""
                cleaned_text = (
                    BeautifulSoup(raw_html, "html.parser").get_text(separator="\n").strip()
                    if raw_html else ""
                )

                # 12) Prepare text for NER
                text_for_nlp = cleaned_text.replace("\n", " ").replace("\r", " ")
                text_for_nlp = re.sub(r"[^\w\s\+\#\.\-]", " ", text_for_nlp)
                text_for_nlp = re.sub(r"\s{2,}", " ", text_for_nlp).strip()

                # 13) Run NER pipeline
                nlp_entities = ner_pipeline(text_for_nlp)
                # Post-process NER output
                unique_skills = clean_ner_entities(nlp_entities)

                # 14) Print to terminal for verification
                print("\n--- Job Posting ---")
                print("Job Title:", job_title)
                print("Posted on:", posted_date or "Unknown")
                print("Extracted skill-like terms (NER):", unique_skills)
                print("-------------------\n")

                # 15) Save data in memory for optional DB persistence
                scraped_jobs.append({
                    "title": job_title,
                    "location": location,
                    "raw_html": raw_html,
                    "cleaned_text": cleaned_text,
                    "date_posted": posted_date,
                    "skills": unique_skills,
                    "raw_url": job_url,
                })
                scraped_count += 1

            self.stdout.write(self.style.SUCCESS(
                f"✅ Fetched {scraped_count} job postings for '{query}' in '{location}'."
            ))

            #
            # 16) Ask user whether to persist to the database
            #
            while True:
                choice = input("Save these postings to the database? (Y/N): ").strip().upper()
                if choice in ("Y", "N"):
                    break
                print("Please enter 'Y' or 'N'.")

            if choice == "Y":
                saved_count = 0
                for job in scraped_jobs:
                    if JobPosting.objects.filter(raw_description=job["raw_url"]).exists():
                        continue

                    job_posting = JobPosting.objects.create(
                        title=job["title"],
                        job_field=job_field_obj,
                        location=job["location"],
                        raw_description=job["raw_html"] or job["raw_url"],
                        cleaned_description=job["cleaned_text"],
                        date_posted=job["date_posted"],
                    )
                    for skill_name in job["skills"]:
                        skill_obj, _ = Skill.objects.get_or_create(name=skill_name)
                        job_posting.skills.add(skill_obj)
                    job_posting.save()
                    saved_count += 1

                self.stdout.write(self.style.SUCCESS(
                    f"✅ Saved {saved_count} job postings to the database."
                ))
            else:
                self.stdout.write("Aborted: No postings were saved to the database.")

        finally:
            driver.quit()
