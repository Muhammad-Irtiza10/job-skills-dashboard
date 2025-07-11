# Generated by Django 5.2.1 on 2025-06-02 18:38

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0002_alter_major_department_alter_major_name"),
    ]

    operations = [
        migrations.CreateModel(
            name="JobField",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100, unique=True)),
                ("description", models.TextField(blank=True)),
            ],
        ),
        migrations.AlterUniqueTogether(
            name="concentration",
            unique_together=None,
        ),
        migrations.RemoveField(
            model_name="concentration",
            name="major",
        ),
        migrations.RemoveField(
            model_name="concentration",
            name="skills",
        ),
        migrations.RemoveField(
            model_name="studentprofile",
            name="concentration",
        ),
        migrations.AlterUniqueTogether(
            name="course",
            unique_together={("major", "code")},
        ),
        migrations.RemoveField(
            model_name="jobposting",
            name="description",
        ),
        migrations.RemoveField(
            model_name="jobposting",
            name="industry",
        ),
        migrations.AddField(
            model_name="certification",
            name="url",
            field=models.URLField(
                blank=True, help_text="(Optional) Link to certification details"
            ),
        ),
        migrations.AddField(
            model_name="jobposting",
            name="cleaned_description",
            field=models.TextField(
                blank=True, help_text="Processed/cleaned version (strip HTML, etc.)"
            ),
        ),
        migrations.AddField(
            model_name="jobposting",
            name="raw_description",
            field=models.TextField(
                blank=True, help_text="Original text scraped from job site", null=True
            ),
        ),
        migrations.AlterField(
            model_name="certification",
            name="relevance_score",
            field=models.FloatField(
                default=0.0,
                help_text="(Optional) How closely this cert maps to market demand",
            ),
        ),
        migrations.AlterField(
            model_name="certification",
            name="skills",
            field=models.ManyToManyField(
                blank=True,
                help_text="Skills obtained or tested by this certification",
                related_name="certifications",
                to="catalog.skill",
            ),
        ),
        migrations.AlterField(
            model_name="course",
            name="major",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="electives",
                to="catalog.major",
            ),
        ),
        migrations.AlterField(
            model_name="course",
            name="skills",
            field=models.ManyToManyField(
                blank=True,
                help_text="Skills taught or reinforced by this elective",
                related_name="elective_courses",
                to="catalog.skill",
            ),
        ),
        migrations.AlterField(
            model_name="jobposting",
            name="skills",
            field=models.ManyToManyField(
                blank=True,
                help_text="Skills required by this job (parsed from description)",
                related_name="job_postings",
                to="catalog.skill",
            ),
        ),
        migrations.AlterField(
            model_name="major",
            name="skills",
            field=models.ManyToManyField(
                blank=True,
                help_text="Baseline skills every student in this major should acquire",
                related_name="majors",
                to="catalog.skill",
            ),
        ),
        migrations.AlterField(
            model_name="skill",
            name="clusters",
            field=models.CharField(
                blank=True,
                help_text="(Optional) Comma-separated tags or related skill clusters",
                max_length=200,
            ),
        ),
        migrations.AlterField(
            model_name="studentprofile",
            name="skills",
            field=models.ManyToManyField(
                blank=True,
                help_text="Actual skills this student has (from major, electives, certifications)",
                related_name="students",
                to="catalog.skill",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="certification",
            unique_together={("name", "provider")},
        ),
        migrations.AddField(
            model_name="jobposting",
            name="job_field",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="job_postings",
                to="catalog.jobfield",
            ),
        ),
        migrations.AddIndex(
            model_name="jobposting",
            index=models.Index(
                fields=["title", "job_field"], name="catalog_job_title_a07c8c_idx"
            ),
        ),
        migrations.RemoveField(
            model_name="course",
            name="concentration",
        ),
        migrations.DeleteModel(
            name="Concentration",
        ),
    ]
