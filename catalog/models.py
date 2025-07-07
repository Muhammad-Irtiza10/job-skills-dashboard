from django.db import models
from django.conf import settings

class Skill(models.Model):
    """
    A single skill or competency. We keep one central Skill table,
    but each Major, JobPosting, Certification, and Course links to it
    via its own ManyToManyField.
    """
    name = models.CharField(max_length=100, unique=True)
    frequency = models.PositiveIntegerField(
        default=0,
        help_text="(Optional) How often this skill appears in job data"
    )
    clusters = models.CharField(
        max_length=200,
        blank=True,
        help_text="(Optional) Comma-separated tags or related skill clusters"
    )

    CATEGORY_CHOICES = [
      ('major',     'Major-Related'),
      ('technical', 'Technical'),
      ('soft',      'Soft'),
    ]
    category = models.CharField(
      max_length=10,
      choices=CATEGORY_CHOICES,
      default='major',
      help_text="Whether this is a major-related, technical, or soft skill"
    )

    def __str__(self):
        return self.name


class Major(models.Model):
    """
    Represents an academic major. Each major has its own set of Skills
    (from the catalog) that any student in this major is assumed to have.
    """
    name = models.CharField(max_length=200, unique=True)
    department = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)

    # ←−− Major.skills is a separate M2M to Skill
    skills = models.ManyToManyField(
        Skill,
        related_name='majors',
        blank=True,
        help_text="Baseline skills every student in this major should acquire"
    )

    def __str__(self):
        return self.name


class Course(models.Model):
    """
    An elective course offered under a Major. Each elective has its own
    set of Skills that it teaches or reinforces.
    """
    code = models.CharField(max_length=20, blank=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    credits = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True
    )
    major = models.ForeignKey(
        Major,
        on_delete=models.CASCADE,
        related_name='electives'
    )

    # ←−− Course.skills is a separate M2M to Skill
    skills = models.ManyToManyField(
        Skill,
        related_name='elective_courses',
        blank=True,
        help_text="Skills taught or reinforced by this elective"
    )

    class Meta:
        unique_together = ('major', 'code')

    def __str__(self):
        return f"{self.code} – {self.name}" if self.code else self.name



class Certification(models.Model):
    """
    An external certification that maps to one or more Skills.
    We will suggest certifications to fill in gaps when a student lacks certain skills.
    """
    name = models.CharField(max_length=200)
    provider = models.CharField(max_length=100, blank=True)
    url = models.URLField(
        blank=True,
        help_text="(Optional) Link to certification details"
    )
    relevance_score = models.FloatField(
        default=0.0,
        help_text="(Optional) How closely this cert maps to market demand"
    )
    # New field to indicate if the certification exam requires payment
    is_paid = models.BooleanField(
        default=True,
        help_text="Whether taking the certification exam requires payment"
    )

    # Certification.skills is a separate M2M to Skill
    skills = models.ManyToManyField(
        Skill,
        related_name='certifications',
        blank=True,
        help_text="Skills obtained or tested by this certification"
    )

    class Meta:
        unique_together = ('name', 'provider')

    def __str__(self):
        return f"{self.name} ({self.provider})" if self.provider else self.name

class JobField(models.Model):
    """
    A broad job category (e.g. 'Software Engineering', 'Data Science'). 
    Students pick a JobField, then we match job postings under that field.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class JobPosting(models.Model):
    title = models.CharField(max_length=200)
    job_field = models.ForeignKey(
        JobField,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='job_postings'
    )
    location = models.CharField(max_length=200, blank=True)

    company_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Name of the company offering this job"
    )

    # Allow NULL/blank so migrations don’t force a default on existing rows
    raw_description = models.TextField(
        null=True,
        blank=True,
        help_text="Original text scraped from job site"
    )
    cleaned_description = models.TextField(
        blank=True,
        help_text="Processed/cleaned version (strip HTML, etc.)"
    )
    date_posted = models.DateField(null=True, blank=True)

    skills = models.ManyToManyField(
        Skill,
        related_name='job_postings',
        blank=True,
        help_text="Skills required by this job (parsed from description)"
    )

    class Meta:
        indexes = [
            models.Index(fields=['title', 'job_field']),
        ]

    def __str__(self):
        return self.title


class StudentProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    major = models.ForeignKey(
        Major, on_delete=models.SET_NULL, null=True, blank=True, related_name='students'
    )
    skills = models.ManyToManyField(Skill, related_name='students', blank=True)
    date_joined = models.DateField(auto_now_add=True)

    # ← new fields:
    company_name    = models.CharField(max_length=200, blank=True)
    JOB_TITLE_CHOICES = [
      ('student', 'Student'),
      ('alumni', 'Alumni'),
      ('other',   'Other'),
    ]
    job_title       = models.CharField(max_length=20, choices=JOB_TITLE_CHOICES, blank=True)
    other_job_title = models.CharField(max_length=100, blank=True, help_text="If you selected Other")
    bio             = models.TextField(blank=True)
    phone_primary   = models.CharField(max_length=20, blank=True)
    phone_secondary = models.CharField(max_length=20, blank=True)
    phone_work      = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username

class FacultyProfile(models.Model):
    """
    A one‐to‐one extension of Django's User for faculty accounts.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="faculty_profile"
    )
    # add any extra faculty fields you might want, e.g. department
    # department = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username
