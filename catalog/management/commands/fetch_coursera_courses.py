#!/usr/bin/env python
"""
Django management command to scrape Coursera courses via Selenium using Edge,
extract skills & certifications with a local Ollama LLM (CPU),
and save into your models.

Usage:
  python manage.py fetch_coursera_courses \
    --query "data science" \
    --max-courses 10 \
    [--max-scrolls 10]
"""
import time
import subprocess
import json

from django.core.management.base import BaseCommand
from selenium import webdriver
from selenium.webdriver.common.by import By
# Edge-specific imports
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions
from webdriver_manager.microsoft import EdgeChromiumDriverManager

from tqdm import tqdm

from catalog.models import Course, Skill, Certification
from catalog.utils.llm_extractor import extract_skills_and_certs


class Command(BaseCommand):
    help = "Fetch Coursera courses via Selenium (Edge) and extract skills & certs locally"

    def add_arguments(self, parser):
        parser.add_argument(
            "--query", "-q", type=str, required=True,
            help="Search keywords (e.g. 'machine learning')"
        )
        parser.add_argument(
            "--max-courses", "-m", type=int, default=10,
            help="Maximum number of courses to fetch"
        )
        parser.add_argument(
            "--max-scrolls", type=int, default=10,
            help="Max scroll attempts when collecting URLs"
        )

    def handle(self, *args, **options):
        query = options["query"]
        max_courses = options["max_courses"]
        max_scrolls = options["max_scrolls"]

        # 1) Setup Selenium with Edge
        edge_opts = EdgeOptions()
        # Headless mode
        # For newer Edge versions, you may need "--headless=new" or just "--headless"
        edge_opts.add_argument("--headless")
        edge_opts.add_argument("--disable-gpu")
        edge_opts.add_argument("--window-size=1920,1080")
        # Optional: suppress logging
        # edge_opts.add_argument("log-level=3")
        driver = webdriver.Edge(
            service=EdgeService(EdgeChromiumDriverManager().install()),
            options=edge_opts
        )
        driver.implicitly_wait(5)

        # 2) Load search page
        search_url = f"https://www.coursera.org/search?query={query.replace(' ', '%20')}"
        self.stdout.write(f"🔍 Opening: {search_url}")
        driver.get(search_url)
        time.sleep(2)

        # 3) Scroll & collect course URLs with limit
        course_urls = []
        prev_count = 0
        self.stdout.write("⏳ Collecting course URLs...")
        for scroll_attempt in range(1, max_scrolls + 1):
            # Find course cards; selector may need adjustment if Coursera changes markup
            cards = driver.find_elements(
                By.CSS_SELECTOR,
                "a[data-click-key='search.search.click.search_card']"
            )
            for c in cards:
                href = c.get_attribute("href")
                if href and href.startswith("https://www.coursera.org/learn/"):
                    url = href.split("?")[0]
                    if url not in course_urls:
                        course_urls.append(url)
                        self.stdout.write(f"  → Found URL {len(course_urls)}: {url}")
                        if len(course_urls) >= max_courses:
                            break
            if len(course_urls) >= max_courses:
                break

            # Logging progress of scroll
            if len(course_urls) == prev_count:
                self.stdout.write(f"  [Scroll {scroll_attempt}/{max_scrolls}] No new URLs found.")
            else:
                self.stdout.write(f"  [Scroll {scroll_attempt}/{max_scrolls}] Collected {len(course_urls)} URLs so far.")
            prev_count = len(course_urls)

            # Scroll down to load more results
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)

        if not course_urls:
            self.stdout.write(self.style.WARNING("No course URLs found; exiting."))
            driver.quit()
            return

        # Trim to requested max
        course_urls = course_urls[:max_courses]
        self.stdout.write(self.style.SUCCESS(f"🔍 Collected {len(course_urls)} course URLs."))

        # 4) Visit each, extract description & run local model
        preview = []
        self.stdout.write("⏳ Scraping pages and extracting skills/certs...")
        for idx, url in enumerate(
                tqdm(course_urls, desc="🔍 Scraping & extracting"),
                start=1
            ):
            driver.get(url)
            # Wait briefly for page load; adjust if needed
            time.sleep(1)

            # Extract course description text; selectors may need tuning
            try:
                desc_el = driver.find_element(
                    By.CSS_SELECTOR,
                    "div.AboutCourse, section[data-test='syllabus'], div[data-test='about-course']"
                )
                raw_text = desc_el.text
            except Exception:
                raw_text = ""

            self.stdout.write(f"[{idx}] URL: {url} | Desc length: {len(raw_text)}")

            # Call local LLM extractor
            try:
                extracted = extract_skills_and_certs(
                    text_input=raw_text,
                    domain="General",
                    max_skills=10,
                    max_certs=5
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Extraction error: {e}"))
                extracted = []

                skills_list = [e.get("skill") for e in extracted if e.get("skill")]
                certs_list  = [e.get("certification") for e in extracted if e.get("certification")]


            preview.append({
                "url": url,
                "title": driver.title,
                "skills": skills_list,
                "certs": certs_list,
                "description": (raw_text[:200] + "…") if raw_text else ""
            })

            self.stdout.write(
                f"    Title: {driver.title}\n"
                f"    Skills: {skills_list}\n"
                f"    Certs:  {certs_list}"
            )

        # 5) Confirm & save
        answer = input(f"\nSave {len(preview)} courses? [Y/n]: ")
        if answer.strip().lower() not in ("", "y", "yes"):
            self.stdout.write(self.style.WARNING("Aborted."))
            driver.quit()
            return

        # 6) Save to DB with progress bar
        self.stdout.write("⏳ Saving to database...")
        for item in tqdm(preview, desc="💾 Saving to database"):
            course_obj, _created = Course.objects.get_or_create(
                url=item["url"],
                defaults={
                    "name":        item["title"],
                    "description": item["description"],
                    # If your Course model has additional required fields, set them here
                    "code":        "",
                    "major_id":    None,
                }
            )
            # Persist skills
            for skill_name in item["skills"]:
                if not skill_name:
                    continue
                sk, _ = Skill.objects.get_or_create(name=skill_name)
                course_obj.skills.add(sk)
            # Persist certifications (skip None/empty)
            for cert_name in item["certs"]:
                if cert_name:
                    cert_obj, _ = Certification.objects.get_or_create(name=cert_name)
                    course_obj.certifications.add(cert_obj)

        self.stdout.write(self.style.SUCCESS(f"💾 Saved {len(preview)} courses."))
        driver.quit()
