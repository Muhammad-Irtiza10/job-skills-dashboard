from django.db import models
from django.conf import settings

class Major(models.Model):
    name        = models.CharField(max_length=200, unique=True)
    department  = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)

    # baseline skills every student in this major should acquire
    skills      = models.ManyToManyField(
        'Skill',
        related_name='majors',
        blank=True
    )

    def __str__(self):
        return self.name


class Concentration(models.Model):
    major       = models.ForeignKey(
        Major,
        on_delete=models.CASCADE,
        related_name='concentrations'
    )
    name        = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # skills specific to this track
    skills      = models.ManyToManyField(
        'Skill',
        related_name='concentrations',
        blank=True
    )

    class Meta:
        unique_together = ('major', 'name')
        verbose_name_plural = 'concentrations'

    def __str__(self):
        return f"{self.major.name} → {self.name}"


class Skill(models.Model):
    name      = models.CharField(max_length=100, unique=True)
    frequency = models.PositiveIntegerField(
        default=0,
        help_text="(Optional) How often this skill appears in job data"
    )
    clusters  = models.CharField(
        max_length=200,
        blank=True,
        help_text="(Optional) Semantically related skill clusters or tags"
    )

    def __str__(self):
        return self.name


class Course(models.Model):
    code          = models.CharField(max_length=20, blank=True)
    name          = models.CharField(max_length=200)
    description   = models.TextField(blank=True)
    credits       = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True
    )
    major         = models.ForeignKey(
        Major,
        on_delete=models.CASCADE,
        related_name='courses'
    )
    concentration = models.ForeignKey(
        Concentration,
        on_delete=models.CASCADE,
        related_name='courses',
        null=True,
        blank=True
    )
    skills        = models.ManyToManyField(
        Skill,
        related_name='courses',
        blank=True
    )

    def __str__(self):
        return f"{self.code} - {self.name}" if self.code else self.name


class Certification(models.Model):
    name            = models.CharField(max_length=200)
    provider        = models.CharField(max_length=100, blank=True)
    relevance_score = models.FloatField(
        default=0.0,
        help_text="(Optional) How closely this cert maps to job-market demand"
    )
    skills          = models.ManyToManyField(
        Skill,
        related_name='certifications',
        blank=True
    )

    def __str__(self):
        return f"{self.name} ({self.provider})" if self.provider else self.name


class JobPosting(models.Model):
    title        = models.CharField(max_length=200)
    industry     = models.CharField(max_length=100, blank=True)
    location     = models.CharField(max_length=200, blank=True)
    description  = models.TextField()
    date_posted  = models.DateField(null=True, blank=True)
    skills       = models.ManyToManyField(
        Skill,
        related_name='job_postings',
        blank=True
    )

    def __str__(self):
        return self.title


class StudentProfile(models.Model):
    """
    Extend Django's built-in User to track academic and skill data.
    """
    user          = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    major         = models.ForeignKey(
        Major,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    concentration = models.ForeignKey(
        Concentration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    skills        = models.ManyToManyField(
        Skill,
        related_name='students',
        blank=True
    )
    date_joined   = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username}"


