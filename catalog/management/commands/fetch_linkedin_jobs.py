# catalog/management/commands/fetch_linkedin_jobs.py

import os
import time
from django.core.management.base import BaseCommand
from django.conf import settings
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from catalog.models import JobField, JobPosting, Skill

# ←–– Assumes you have a function that, given a block of text,
#     returns a Python list of skill‐strings, e.g. ["Python", "Django", "AWS"]
#     You can replace this stub with your actual NLP pipeline call.
def extract_skills_from_text(cleaned_text: str) -> list[str]:
    """
    Stub: call your real NLP skill extractor here.
    E.g. return my_nlp_pipeline.extract_skills(cleaned_text)
    """
    # For demo purposes, let’s pretend every time we see the word "Python"
    # in the text, we tag the skill "Python". In reality, you’d call your
    # trained NLP pipeline (maybe spaCy + custom model, or any other).
    skills = []
    if "Python" in cleaned_text:
        skills.append("Python")
    if "Django" in cleaned_text:
        skills.append("Django")
    # … etc …
    return list(set(skills))


class Command(BaseCommand):
    help = "Fetches job postings from LinkedIn and saves raw/cleaned descriptions + skills."

    def add_arguments(self, parser):
        parser.add_argument(
            "--query",
            type=str,
            default="Software Engineer",
            help="Search query for job title (e.g. 'Data Scientist')",
        )
        parser.add_argument(
            "--location",
            type=str,
            default="United Arab Emirates",
            help="Location for the job search (e.g. 'Dubai, UAE')",
        )
        parser.add_argument(
            "--jobfield",
            type=str,
            default="Software Engineering",
            help="Name of the JobField to associate these postings with",
        )
        parser.add_argument(
            "--max-jobs",
            type=int,
            default=20,
            help="Maximum number of job postings to scrape",
        )

    def handle(self, *args, **options):
        query = options["query"]
        location = options["location"]
        jobfield_name = options["jobfield"]
        max_jobs = options["max_jobs"]

        # 1) Get or create the JobField in the database
        job_field_obj, _ = JobField.objects.get_or_create(name=jobfield_name)

        # 2) Configure Selenium (headless Chrome)
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--window-size=1920,1080")

        # Set the CHROMEDRIVER_BINARY (adjust path if needed)
        chromedriver_path = os.getenv("CHROMEDRIVER_PATH", "/usr/local/bin/chromedriver")
        driver = webdriver.Chrome(executable_path=chromedriver_path, options=chrome_options)

        try:
            # 3) Navigate to LinkedIn Jobs search page (example URL structure):
            #    https://www.linkedin.com/jobs/search/?keywords=Software%20Engineer&location=UAE
            #    In practice, you must be logged in. You can reuse cookies or do a login step.

            url = (
                "https://www.linkedin.com/jobs/search/"
                f"?keywords={query.replace(' ', '%20')}"
                f"&location={location.replace(' ', '%20')}"
            )
            self.stdout.write(f"→ Opening LinkedIn Jobs search: {url}")
            driver.get(url)

            # 4) OPTIONAL: If you need to log in first (only if not already logged in):
            #    You can do something like:
            #
            #    username_in = driver.find_element(By.ID, "session_key")
            #    password_in = driver.find_element(By.ID, "session_password")
            #    username_in.send_keys(os.getenv("LINKEDIN_USER"))
            #    password_in.send_keys(os.getenv("LINKEDIN_PASS"))
            #    driver.find_element(By.XPATH, '//button[@type="submit"]').click()
            #    time.sleep(3)
            #
            #    For now, assume you have a cookie/session already loaded.

            time.sleep(5)  # let the page load and render

            # 5) Scroll down a bit so more job listings load (LinkedIn is infinite-scroll).
            SCROLL_PAUSE_SEC = 2
            last_height = driver.execute_script("return document.body.scrollHeight")
            while True:
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(SCROLL_PAUSE_SEC)
                new_height = driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
                    break
                last_height = new_height

            # 6) Now grab all job cards on this page
            job_cards = driver.find_elements(By.CSS_SELECTOR, "ul.jobs-search__results-list li")

            scraped_count = 0
            for card in job_cards:
                if scraped_count >= max_jobs:
                    break

                try:
                    # Each card contains a link to the job detail page
                    job_link_elem = card.find_element(By.CSS_SELECTOR, "a.result-card__full-card-link")
                    job_url = job_link_elem.get_attribute("href")
                except Exception:
                    continue

                # Check if this URL is already in our DB
                if JobPosting.objects.filter(raw_description=job_url).exists():
                    # We’ll use raw_description temporarily to store the URL as a uniqueness check.
                    continue

                # 7) Click or navigate to this job’s detail page
                driver.get(job_url)
                time.sleep(3)  # wait for detail to render

                # 8) Extract the raw HTML for the job description area
                #    LinkedIn’s job description is often in a <div class="description__text"> or similar.
                page_source = driver.page_source
                soup = BeautifulSoup(page_source, "html.parser")

                # Attempt to locate the job description container:
                desc_container = soup.select_one("div.description__text") or \
                                 soup.select_one("div.jobs-description__container") or \
                                 soup.select_one("div.jobs-description-content__text")
                if not desc_container:
                    # If LinkedIn changes their DOM, adjust selectors accordingly
                    raw_html = ""
                else:
                    raw_html = str(desc_container)  # includes tags

                # 9) Clean the HTML to plain text
                cleaned_text = ""
                if raw_html:
                    # Use BeautifulSoup to strip tags
                    cleaned_text = (
                        BeautifulSoup(raw_html, "html.parser")
                        .get_text(separator="\n")
                        .strip()
                    )

                # 10) Save into JobPosting model
                job_posting = JobPosting.objects.create(
                    title=card.text.split("\n")[0] or "N/A",
                    job_field=job_field_obj,
                    location=location,
                    raw_description=raw_html or job_url,   # store the raw HTML snippet (or fallback to URL)
                    cleaned_description=cleaned_text,
                )

                # 11) Run your NLP skill extractor on cleaned_text
                found_skills = extract_skills_from_text(cleaned_text)

                # 12) For each skill string, get_or_create the Skill object in DB, then M2M
                for skill_name in found_skills:
                    skill_obj, _ = Skill.objects.get_or_create(name=skill_name)
                    job_posting.skills.add(skill_obj)

                job_posting.save()
                scraped_count += 1

                # 13) Go back to the main listing page so we can pick the next card
                driver.back()
                time.sleep(2)

            self.stdout.write(self.style.SUCCESS(
                f"Successfully scraped {scraped_count} job postings for '{query}' in '{location}'."
            ))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during scraping: {e}"))
        finally:
            driver.quit()
