# catalog/management/commands/fetch_linkedin_jobs.py

import os
import time
from django.core.management.base import BaseCommand
from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from bs4 import BeautifulSoup

from catalog.models import JobField, JobPosting, Skill


def extract_skills_from_text(cleaned_text: str) -> list[str]:
    """
    TODO: Replace this stub with your actual NLP pipeline.
    It should return a list of normalized skill names 
    extracted from the job’s plain‐text description.
    """
    skills = []
    text_lower = cleaned_text.lower()
    if "python" in text_lower:
        skills.append("Python")
    if "django" in text_lower:
        skills.append("Django")
    if "aws" in text_lower or "amazon web services" in text_lower:
        skills.append("AWS")
    # … add your own rules or call your real model …
    return list(set(skills))


class Command(BaseCommand):
    help = (
        "Logs into LinkedIn, searches for jobs, "
        "scrapes raw/cleaned descriptions, extracts skills, "
        "and stores everything in the DB."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--query",
            type=str,
            default="Software Engineer",
            help="Job title/keywords (e.g. 'Data Scientist')",
        )
        parser.add_argument(
            "--location",
            type=str,
            default="United Arab Emirates",
            help="Location string for the search (e.g. 'Dubai, UAE')",
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

        # 1) Ensure we have a JobField object in the DB
        job_field_obj, _ = JobField.objects.get_or_create(name=jobfield_name)

        # 2) EdgeDriver setup: point to your msedgedriver.exe
        EDGE_DRIVER_PATH = r"C:\Users\aurakcyber5\Downloads\edgedriver_win32\msedgedriver.exe"
        service = EdgeService(executable_path=EDGE_DRIVER_PATH)

        # 3) Edge options (headless, window size, etc.)
        edge_options = EdgeOptions()
        edge_options.use_chromium = True
        edge_options.add_argument("--disable-gpu")
        edge_options.add_argument("--window-size=1920,1080")

        driver = webdriver.Edge(service=service, options=edge_options)

        try:
            # —— 4) Log in to LinkedIn ——
            linkedin_user = os.getenv("LINKEDIN_USER")
            linkedin_pass = os.getenv("LINKEDIN_PASS")
            if not linkedin_user or not linkedin_pass:
                self.stderr.write("ERROR: Please set LINKEDIN_USER and LINKEDIN_PASS in env.")
                return

            driver.get("https://www.linkedin.com/login")
            time.sleep(2)

            # Locate username/password fields, fill them, and submit
            email_elem = driver.find_element(By.ID, "username")
            password_elem = driver.find_element(By.ID, "password")
            email_elem.clear()
            email_elem.send_keys(linkedin_user)
            password_elem.clear()
            password_elem.send_keys(linkedin_pass)
            password_elem.send_keys(Keys.ENTER)

            time.sleep(5)  # wait for login to finalize

            # Verify login by checking URL change
            if "login" in driver.current_url:
                self.stderr.write("ERROR: LinkedIn login failed. Double-check creds.")
                return
            self.stdout.write(self.style.SUCCESS("✅ LinkedIn login successful."))

            # —— 5) Navigate to the Jobs search page ——
            # Example search URL structure:
            search_url = (
                "https://www.linkedin.com/jobs/search/"
                f"?keywords={query.replace(' ', '%20')}"
                f"&location={location.replace(' ', '%20')}"
            )
            self.stdout.write(f"→ Opening LinkedIn Jobs search: {search_url}")
            driver.get(search_url)
            time.sleep(5)

            # —— 6) Scroll down to load more results (infinite scroll) ——
            SCROLL_PAUSE = 2
            last_height = driver.execute_script("return document.body.scrollHeight")
            while True:
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(SCROLL_PAUSE)
                new_height = driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
                    break
                last_height = new_height

            # —— 7) Collect job cards from the results list ——
            job_cards = driver.find_elements(By.CSS_SELECTOR, "ul.jobs-search__results-list li")
            scraped_count = 0

            for card in job_cards:
                if scraped_count >= max_jobs:
                    break

                # Each card has a link to the job detail page
                try:
                    link_elem = card.find_element(By.CSS_SELECTOR, "a.result-card__full-card-link")
                    job_url = link_elem.get_attribute("href")
                except Exception:
                    continue

                # Skip if we already have this URL stored (checking raw_description)
                if JobPosting.objects.filter(raw_description=job_url).exists():
                    continue

                # —— 8) Visit the job detail page ——
                driver.get(job_url)
                time.sleep(3)

                page_html = driver.page_source
                soup = BeautifulSoup(page_html, "html.parser")

                # LinkedIn’s description container classes:
                desc_div = (
                    soup.select_one("div.description__text")
                    or soup.select_one("div.jobs-description__container")
                    or soup.select_one("div.jobs-description-content__text")
                )
                raw_html = str(desc_div) if desc_div else ""
                cleaned_text = (
                    BeautifulSoup(raw_html, "html.parser")
                    .get_text(separator="\n")
                    .strip()
                    if raw_html
                    else ""
                )

                # —— 9) Create & save the JobPosting record ——
                job_posting = JobPosting.objects.create(
                    title=card.text.split("\n")[0] or "N/A",
                    job_field=job_field_obj,
                    location=location,
                    raw_description=raw_html or job_url,
                    cleaned_description=cleaned_text,
                )

                # —— 10) Run your NLP pipeline on cleaned_text ——
                found_skills = extract_skills_from_text(cleaned_text)

                # —— 11) Save each extracted skill to Skill table, M2M-attach it ——
                for skill_name in found_skills:
                    skill_obj, _ = Skill.objects.get_or_create(name=skill_name)
                    job_posting.skills.add(skill_obj)

                job_posting.save()
                scraped_count += 1

                # Go back to the search results page to pick the next card
                driver.back()
                time.sleep(2)

            self.stdout.write(self.style.SUCCESS(
                f"✅ Scraped {scraped_count} job postings for '{query}' in '{location}'."
            ))

        except Exception as e:
            self.stderr.write(f"ERROR during scraping: {e}")

        finally:
            driver.quit()
