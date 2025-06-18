# catalog/management/commands/ingest_ms_certs.py
import requests
from django.core.management.base import BaseCommand
from catalog.models import Certification, Skill
from catalog.nlp import extract_skills

class Command(BaseCommand):
    help = "Fetch Microsoft Learn certifications and interactively confirm skill extraction"

    def handle(self, *args, **options):
        BASE = "https://learn.microsoft.com/api/catalog/"
        params = {"type": "certifications", "$top": 50, "$skip": 0}
        resp = requests.get(BASE, params=params)
        resp.raise_for_status()

        certs = resp.json().get("certifications", [])
        total = len(certs)
        self.stdout.write(self.style.SUCCESS(f"Fetched {total} certifications"))

        for idx, item in enumerate(certs, start=1):
            title = item["title"].strip()
            summary = item.get("summary", "") or item.get("subtitle", "")
            tags = extract_skills(summary)

            # Display in terminal
            self.stdout.write(f"\n[{idx}/{total}] {title}")
            self.stdout.write(f"Extracted skills: {tags}\n")

            # Prompt user
            save = input("Save these skills to database? [y/N]: ").strip().lower()
            if save == 'y':
                cert, _ = Certification.objects.update_or_create(
                    name=title,
                    provider="Microsoft",
                    defaults={"url": item.get("url", "").strip()}
                )
                cert.skills.clear()
                for tag in tags:
                    skill_obj, _ = Skill.objects.get_or_create(name=tag)
                    cert.skills.add(skill_obj)
                self.stdout.write(self.style.SUCCESS(f"Saved: {title} with {len(tags)} skills."))
            else:
                self.stdout.write(self.style.WARNING(f"Skipped: {title}"))

        self.stdout.write(self.style.SUCCESS("Done processing certifications."))
