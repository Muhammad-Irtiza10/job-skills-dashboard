# myapp/management/commands/scrape_all_majors.py

import time

from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.management import call_command

from catalog.models import JobField

class Command(BaseCommand):
    help = (
        "Iterate over every major (from settings.MAJOR_TO_JOBFIELDS), "
        "and scrape all associated job titles. "
        "Each posting is saved with job_field=<major>."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--location",
            type=str,
            default="United Arab Emirates",
            help="Location string for the search (e.g. 'Dubai, UAE')"
        )
        parser.add_argument(
            "--max-per-title",
            type=int,
            default=10,
            help="How many job postings to fetch per title"
        )

    def handle(self, *args, **options):
        location_str = options["location"]
        max_per_title = options["max_per_title"]

        # Loop over each major → list of job titles
        for major, titles in settings.MAJOR_TO_JOBFIELDS.items():
            # Ensure a JobField row exists for this major
            jobfield_obj, _ = JobField.objects.get_or_create(name=major)

            for title in titles:
                self.stdout.write(f"\n🔍 Scraping '{title}' under major '{major}' …\n")

                # Call our fetch_linkedin_jobs command programmatically:
                #   - query = job-title (e.g. "Backend Developer")
                #   - location = fixed location (e.g. "United Arab Emirates")
                #   - jobfield = major (e.g. "Computer Science")
                #   - max-jobs = how many per-title limit
                call_command(
                    "fetch_linkedin_jobs",
                    query=title,
                    location=location_str,
                    jobfield=major,
                    max_jobs=max_per_title,
                )

                # Small delay between titles to avoid LinkedIn rate‐limiting
                time.sleep(2)

        self.stdout.write(self.style.SUCCESS("\n✅ Completed scraping all majors.\n"))
