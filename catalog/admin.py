# Register your models here.
# catalog/admin.py
from django.contrib import admin
from .models import (
    Skill,
    Major,
    Course,
    Certification,
    JobField,
    JobPosting,
    StudentProfile,
    FacultyProfile,
)

from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "frequency", "clusters")
    search_fields = ("name", "clusters")
    list_filter = ("clusters",)
    ordering = ("name",)


@admin.register(Major)
class MajorAdmin(admin.ModelAdmin):
    list_display = ("name", "department")
    search_fields = ("name", "department", "description")
    filter_horizontal = ("skills",)
    ordering = ("name",)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "major", "credits")
    list_filter = ("major",)
    search_fields = ("code", "name", "description")
    filter_horizontal = ("skills",)
    ordering = ("major", "code")


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ("name", "provider", "relevance_score")
    search_fields = ("name", "provider", "url")
    filter_horizontal = ("skills",)
    ordering = ("name",)


@admin.register(JobField)
class JobFieldAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(JobPosting)
class JobPostingAdmin(admin.ModelAdmin):
    list_display = ("title", "job_field", "location", "date_posted")
    list_filter = ("job_field", "location", "date_posted")
    search_fields = ("title", "location", "raw_description", "cleaned_description")
    filter_horizontal = ("skills",)
    ordering = ("-date_posted", "title")


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "major", "date_joined")
    list_filter = ("major", "date_joined")
    search_fields = ("user__username", "user__first_name", "user__last_name", "major__name")
    filter_horizontal = ("skills",)
    ordering = ("user__username",)

@admin.register(FacultyProfile)
class FacultyProfileAdmin(admin.ModelAdmin):
    list_display = ("user",)
    search_fields = ("user__email",)

