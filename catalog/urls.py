from django.urls import path
from .views import (
    MajorList, MajorSkillsDetail,
    ProfileDetail, JobSearch, MissingSkills, FacultyProfileDetail,
)

urlpatterns = [
    path("majors/",                        MajorList.as_view(),       name="majors"),
    path("majors/<int:pk>/skills/",        MajorSkillsDetail.as_view(), name="major-skills"),
    path("profile/",                       ProfileDetail.as_view(),   name="profile"),
    path("faculty/profile/",         FacultyProfileDetail.as_view(), name="faculty-profile"),
    path("jobs/",                          JobSearch.as_view(),       name="job-search"),
    path("jobs/<int:pk>/missing/",         MissingSkills.as_view(),   name="missing-skills"),
]

