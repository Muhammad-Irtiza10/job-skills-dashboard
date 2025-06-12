# myapp/management/commands/scrape_all_majors.py

import time
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.management import call_command

from catalog.models import JobField

class Command(BaseCommand):
    help = (
        "Iterate over every major (from settings.MAJOR_TO_JOBFIELDS),\n"
        "and scrape all associated job titles from Bayt.com.\n"
        "Each posting is saved with job_field=<major>."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--location",
            type=str,
            default="United-Arab-Emirates",
            help="Bayt location slug (e.g. 'United-Arab-Emirates')",
        )
        parser.add_argument(
            "--max-per-title",
            type=int,
            default=10,
            help="How many job postings to fetch per title",
        )

    def handle(self, *args, **options):
        location_slug = options["location"]
        max_per_title = options["max_per_title"]

        for major, titles in settings.MAJOR_TO_JOBFIELDS.items():
            # ensure the JobField exists
            JobField.objects.get_or_create(name=major)

            for title in titles:
                self.stdout.write(f"\n🔍 Scraping Bayt for '{title}' under major '{major}' …\n")

                # call our Bayt scraper
                call_command(
                    "fetch_bayt_jobs",
                    query=title,
                    location=location_slug,
                    jobfield=major,
                    max_jobs=max_per_title,
                )

                # avoid hammering the site
                time.sleep(2)

        self.stdout.write(self.style.SUCCESS("\n✅ Completed scraping all majors.\n"))
