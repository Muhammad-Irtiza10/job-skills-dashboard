#!/usr/bin/env python
"""
Django management command to scrape Coursera courses via Selenium,
extract skills & certifications with a local Hugging Face pipeline (CPU),
and save into your models.

Usage:
  python manage.py fetch_coursera_courses \
    --query "data science" \
    --max-courses 10
"""
import time
from django.core.management.base import BaseCommand
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

from catalog.models import Course, Skill, Certification
from catalog.Utils.llm_extractor import extract_skills_and_certs


class Command(BaseCommand):
    help = "Fetch Coursera courses via Selenium and extract skills & certs locally"

    def add_arguments(self, parser):
        parser.add_argument(
            "--query", "-q", type=str, required=True,
            help="Search keywords (e.g. 'machine learning')"
        )
        parser.add_argument(
            "--max-courses", "-m", type=int, default=10,
            help="Maximum number of courses to fetch"
        )

    def handle(self, *args, **options):
        query = options["query"]
        max_courses = options["max_courses"]

        # 1) Setup Selenium
        chrome_opts = webdriver.ChromeOptions()
        chrome_opts.add_argument("--headless")
        chrome_opts.add_argument("--disable-gpu")
        chrome_opts.add_argument("--window-size=1920,1080")
        driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=chrome_opts
        )
        driver.implicitly_wait(5)

        # 2) Load search page
        search_url = f"https://www.coursera.org/search?query={query.replace(' ', '%20')}"
        self.stdout.write(f"🔍 Opening: {search_url}")
        driver.get(search_url)
        time.sleep(2)

        # 3) Scroll & collect course URLs
        course_urls = []
        while len(course_urls) < max_courses:
            cards = driver.find_elements(By.CSS_SELECTOR, "a[data-click-key='search.search.click.search_card']")
            for c in cards:
                href = c.get_attribute("href")
                if href and href.startswith("https://www.coursera.org/learn/"):
                    url = href.split("?")[0]
                    if url not in course_urls:
                        course_urls.append(url)
                        if len(course_urls) >= max_courses:
                            break
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)

        self.stdout.write(self.style.SUCCESS(f"🔍 Collected {len(course_urls)} course URLs"))

        # 4) Visit each, extract description & run the local model
        preview = []
        for idx, url in enumerate(course_urls[:max_courses], start=1):
            driver.get(url)
            time.sleep(1)

            try:
                desc_el = driver.find_element(
                    By.CSS_SELECTOR,
                    "div.AboutCourse, section[data-test='syllabus'], div[data-test='about-course']"
                )
                raw_text = desc_el.text
            except:
                raw_text = ""

            extracted = extract_skills_and_certs(
                text_input=raw_text,
                domain="General",
                max_skills=10,
                max_certs=5
            )

            preview.append({
                "url": url,
                "title": driver.title,
                "skills": [e["skill"] for e in extracted if "skill" in e],
                "certs": [e["certification"] for e in extracted if "certification" in e],
                "description": raw_text[:200] + "…"
            })

            self.stdout.write(
                f"[{idx}] {driver.title}\n"
                f"    Skills: {preview[-1]['skills']}\n"
                f"    Certs:  {preview[-1]['certs']}"
            )

        # 5) Confirm & save
        answer = input(f"\nSave {len(preview)} courses? [Y/n]: ")
        if answer.strip().lower() not in ("", "y", "yes"):
            self.stdout.write(self.style.WARNING("Aborted."))
            driver.quit()
            return

        for item in preview:
            course_obj, _ = Course.objects.get_or_create(
                url=item["url"],
                defaults={
                    "name":        item["title"],
                    "description": item["description"],
                    "code":        "",
                    "major_id":    None
                }
            )
            for skill in item["skills"]:
                sk, _ = Skill.objects.get_or_create(name=skill)
                course_obj.skills.add(sk)
            for cert in item["certs"]:
                cert_obj, _ = Certification.objects.get_or_create(name=cert)
                course_obj.certifications.add(cert_obj)

        self.stdout.write(self.style.SUCCESS(f"💾 Saved {len(preview)} courses."))
        driver.quit()
