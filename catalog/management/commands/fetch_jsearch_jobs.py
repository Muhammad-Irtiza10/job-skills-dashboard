# catalog/management/commands/fetch_jsearch_jobs.py
"""
Refresh job postings from the JSearch API: one search per job field (1 API request each),
rotating through that field's job titles so each run brings different roles.

    python manage.py fetch_jsearch_jobs                     # all fields
    python manage.py fetch_jsearch_jobs --fields "Computer Science" --dry-run
    python manage.py fetch_jsearch_jobs --max-age-days 45   # also remove older live jobs

Needs JSEARCH_API_KEY in the environment or .env.
"""
import os
from datetime import date, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from catalog import jsearch
from catalog.models import JobField, JobPosting, Skill


class Command(BaseCommand):
    help = "Fetch fresh job postings from JSearch (LinkedIn, Indeed, Bayt, ... via Google for Jobs)."

    def add_arguments(self, parser):
        parser.add_argument("--fields", nargs="*", help="job field names (default: all)")
        parser.add_argument("--country", default="ae")
        parser.add_argument("--where", default="UAE", help="place added to each search")
        parser.add_argument("--max-age-days", type=int, default=45, help="delete live jobs posted before this")
        parser.add_argument("--dry-run", action="store_true", help="search and report, save nothing")
        parser.add_argument("--rematch", action="store_true",
                            help="only recompute skills for saved live jobs from their descriptions (no API requests)")

    def handle(self, *args, **o):
        # match against skills students actually use: skills of a major first (they win case-duplicates),
        # then other sorted technical/soft skills
        in_majors = Skill.objects.filter(majors__isnull=False).distinct().order_by("id").values_list("id", "name")
        others = Skill.objects.filter(majors__isnull=True).exclude(category="major").order_by("id").values_list("id", "name")
        index = jsearch.build_skill_index(list(in_majors) + list(others))

        if o["rematch"]:
            jobs = JobPosting.objects.exclude(external_id=None)
            for p in jobs:
                p.skills.set(jsearch.match_skills(f"{p.title}\n{p.raw_description or ''}", index))
            self.stdout.write(self.style.SUCCESS(f"Re-matched skills for {jobs.count()} live jobs."))
            return

        key = os.environ.get("JSEARCH_API_KEY")
        if not key:
            raise CommandError("JSEARCH_API_KEY is not set. Add it to .env (see .env.example).")

        fields = JobField.objects.all().order_by("name")
        if o["fields"]:
            fields = fields.filter(name__in=o["fields"])
        titles_by_field = getattr(settings, "MAJOR_TO_JOBFIELDS", {})
        week = date.today().isocalendar()[1]
        saved = updated = 0

        for field in fields:
            titles = titles_by_field.get(field.name) or [field.name]
            query = f"{titles[week % len(titles)]} jobs in {o['where']}"
            try:
                jobs = jsearch.search(query, key, country=o["country"])
                if not jobs and query != f"{field.name} jobs in {o['where']}":
                    # niche title found nothing: one broader search on the field name
                    query = f"{field.name} jobs in {o['where']}"
                    jobs = jsearch.search(query, key, country=o["country"])
            except jsearch.JSearchError as e:
                self.stderr.write(self.style.ERROR(f"{field.name}: {e}"))
                continue
            sources = sorted({j.get("job_publisher") or "?" for j in jobs})
            self.stdout.write(f"{field.name}: '{query}' -> {len(jobs)} jobs ({', '.join(sources)})")
            if o["dry_run"]:
                continue

            for job in jobs:
                values = jsearch.to_posting(job)
                if not values:
                    continue
                skill_ids = jsearch.match_skills(f"{values['title']}\n{values['raw_description']}", index)
                values.update(job_field=field, cleaned_description=values["raw_description"], fetched_at=timezone.now())
                posting, created = JobPosting.objects.update_or_create(external_id=values.pop("external_id"), defaults=values)
                posting.skills.set(skill_ids)
                saved += created
                updated += not created

        cutoff = date.today() - timedelta(days=o["max_age_days"])
        stale = JobPosting.objects.exclude(external_id=None).filter(date_posted__lt=cutoff)
        removed = 0 if o["dry_run"] else stale.count()
        if removed:
            stale.delete()
        self.stdout.write(self.style.SUCCESS(f"Done: {saved} new, {updated} updated, {removed} expired removed."))
