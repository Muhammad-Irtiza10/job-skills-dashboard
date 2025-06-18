# catalog/management/commands/scrape_aws_certs.py

import os
import json
import time
import csv
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.edge.service import Service
from webdriver_manager.microsoft import EdgeChromiumDriverManager
from django.core.management.base import BaseCommand
from catalog.models import Certification, Skill

class Command(BaseCommand):
    help = "Scrape AWS certifications and load exam domains from local domains_map.json"

    AWS_URL  = "https://aws.amazon.com/certification/"
    LIST_SEL = "a[data-rg-n='Link']"
    HEAD_SEL = {"data-rg-n": "TitleText"}

    def handle(self, *args, **options):
        # Load local domains mapping
        cmd_dir = os.path.dirname(__file__)
        map_path = os.path.join(cmd_dir, 'domains_map.json')
        try:
            with open(map_path, 'r', encoding='utf-8') as f:
                domains_map = json.load(f)
        except FileNotFoundError:
            self.stderr.write(self.style.WARNING(
                f"domains_map.json not found at {map_path}. Using empty domains list."))
            domains_map = {}

        # Launch headless Edge
        opts = Options()
        opts.add_argument("--headless")
        opts.add_argument("--disable-gpu")
        service = Service(EdgeChromiumDriverManager().install())
        driver = webdriver.Edge(service=service, options=opts)

        self.stdout.write("➡️ Loading AWS certification listing…")
        driver.get(self.AWS_URL)
        time.sleep(3)
        html = driver.page_source
        driver.quit()

        soup = BeautifulSoup(html, "html.parser")
        rows = []

        for a in soup.select(self.LIST_SEL):
            href = a.get("href")
            if not href:
                continue
            cert_url = requests.compat.urljoin(self.AWS_URL, href)
            title_el = a.find("h4", self.HEAD_SEL)
            title = title_el.get_text(strip=True) if title_el else None
            if not title:
                continue

            # Get domains from local map
            domains = domains_map.get(title, [])

            # Upsert Certification
            cert, _ = Certification.objects.update_or_create(
                name=title,
                provider="AWS",
                defaults={"url": cert_url, "is_paid": True}
            )
            cert.skills.clear()
            for domain in domains:
                sk, _ = Skill.objects.get_or_create(name=domain)
                cert.skills.add(sk)

            rows.append((title, cert_url, domains))

        # Reporting & CSV
        self.stdout.write(self.style.SUCCESS(
            f"✅ Loaded {len(rows)} AWS certifications with mapped domains."))
        csv_path = "aws_certs_with_domains.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Title", "URL", "Domains"])
            for t, u, ds in rows:
                writer.writerow([t, u, "; ".join(ds)])
        self.stdout.write(f"🔍 CSV written to {csv_path}")

