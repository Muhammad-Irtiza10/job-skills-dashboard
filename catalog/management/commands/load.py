# catalog/management/commands/load.py

from django.core.management.base import BaseCommand, CommandError
from pathlib import Path

from catalog.models import Major, Skill

class Command(BaseCommand):
    help = "Load skills from a text file into a Major"

    def add_arguments(self, parser):
        parser.add_argument(
            'major_name',
            type=str,
            help='Name of the Major to attach skills to (must match Major.name)'
        )
        parser.add_argument(
            'file_path',
            type=Path,
            help='Path to the .txt file listing one skill per line'
        )

    def handle(self, *args, **options):
        major_name = options['major_name']
        file_path: Path = options['file_path']

        if not file_path.exists():
            raise CommandError(f"File not found: {file_path}")

        # Get or create the Major
        major, created = Major.objects.get_or_create(name=major_name)
        if created:
            self.stdout.write(self.style.WARNING(f"Created new Major: {major_name}"))

        count = 0
        with file_path.open(encoding='utf-8') as f:
            for raw in f:
                name = raw.strip()
                if not name:
                    continue

                # Supply a default category to satisfy non-null constraint
                skill, created = Skill.objects.get_or_create(
                    name=name,
                    defaults={'category': major_name}
                )

                # If it existed but category is still blank/null, update it
                if not created and not getattr(skill, 'category', None):
                    skill.category = major_name
                    skill.save(update_fields=['category'])

                major.skills.add(skill)
                count += 1

        major.save()
        self.stdout.write(self.style.SUCCESS(
            f"✅ Loaded {count} skills into Major “{major.name}”"
        ))
