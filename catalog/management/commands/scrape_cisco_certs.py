# catalog/management/commands/scrape_cisco_certs.py

import os
import json
import csv
import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from catalog.models import Certification, Skill

class Command(BaseCommand):
    help = "Scrape all Cisco ‘Cisco Certified…’ certs from the main certs page, map domains, and upsert"

    # Corrected URL (drop “index.html”)
    INDEX_URL    = "https://www.cisco.com/c/en/us/training-events/training-certifications/certifications.html"
    MAP_FILENAME = "cisco_domains_map.json"

    def handle(self, *args, **options):
        # 1. Load domain‐map
        cmd_dir = os.path.dirname(__file__)
        map_path = os.path.join(cmd_dir, self.MAP_FILENAME)
        try:
            with open(map_path, "r", encoding="utf-8") as f:
                domains_map = json.load(f)
            self.stdout.write(self.style.SUCCESS(f"✅ Loaded {len(domains_map)} mappings"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"❌ Failed to load {map_path}: {e}"))
            return

        # 2. Fetch & parse Cisco certs page
        try:
            resp = requests.get(self.INDEX_URL, headers={"User-Agent":"Mozilla/5.0"})
            resp.raise_for_status()
        except requests.HTTPError as e:
            self.stderr.write(self.style.ERROR(f"❌ Couldn’t fetch certs page: {e}"))
            return

        soup = BeautifulSoup(resp.text, "html.parser")
        rows = []
        seen = set()

        # 3. Find every “Cisco Certified …” heading (h2/h3)
        for header in soup.find_all(["h2", "h3"], string=lambda t: t and t.strip().startswith("Cisco Certified")):
            title = header.get_text(strip=True)
            if title in seen:
                continue
            seen.add(title)

            # grab the very next <a href>
            link = header.find_next("a", href=True)
            if not link:
                self.stderr.write(f"⚠️ No link for {title!r}, skipping")
                continue

            href = link["href"]
            if href.startswith("/"):
                href = requests.compat.urljoin(self.INDEX_URL, href)

            # 4. Map domains
            domains = domains_map.get(title, [])
            rows.append((title, href, domains))

            # 5. Upsert into DB
            cert, _ = Certification.objects.update_or_create(
                name=title, provider="Cisco",
                defaults={"url": href, "is_paid": True}
            )
            cert.skills.clear()
            for d in domains:
                sk, _ = Skill.objects.get_or_create(name=d)
                cert.skills.add(sk)

        # 6. Report & CSV
        total = len(rows)
        self.stdout.write(self.style.SUCCESS(f"✅ Loaded {total} Cisco certifications."))
        out_csv = "cisco_certs_with_domains.csv"
        with open(out_csv, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["Title", "URL", "Domains"])
            for t, u, ds in rows:
                w.writerow([t, u, "; ".join(ds)])
        self.stdout.write(f"🔍 CSV written to {out_csv}")
