from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models      import StudentProfile as Profile, Major, JobPosting, Skill, Certification
from .serializers import (
    MajorSerializer,
    MajorSkillsSerializer,
    ProfileSerializer,
    JobPostingSerializer,
    MissingSerializer,
    SkillSerializer, 
    CertificationSerializer,
    FacultyProfileSerializer,
)

#
# 1) /api/majors/  →  list of all majors
#
class MajorList(generics.ListAPIView):
    queryset = Major.objects.all()
    serializer_class = MajorSerializer


#
# 2) /api/majors/<pk>/skills/  →  one major + its skills
#
class MajorSkillsDetail(generics.RetrieveAPIView):
    queryset = Major.objects.all()
    serializer_class = MajorSkillsSerializer


#
# 3) /api/profile/  →  view & update the currently authenticated student's profile
#
class ProfileDetail(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        prof = request.user.profile
        return Response(ProfileSerializer(prof).data)

    def put(self, request):
        prof = request.user.profile
        serializer = ProfileSerializer(prof, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


#
# 4) /api/jobs/?title=Foo  →  list job postings filtered by title substring
#
class JobSearch(generics.ListAPIView):
    serializer_class = JobPostingSerializer

    def get_queryset(self):
        title = self.request.query_params.get("title", "")
        return JobPosting.objects.filter(title__icontains=title)


#
# 5) /api/jobs/<pk>/missing/  →  find which skills the user is missing for a given job
#    and suggest certifications for each missing skill
#
class MissingSkills(APIView):
    def get(self, request, pk):
        job  = get_object_or_404(JobPosting, pk=pk)
        prof = request.user.profile

        user_sk = set(prof.skills.values_list("id", flat=True))
        job_sk  = set(job.skills.values_list("id", flat=True))

        missing = Skill.objects.filter(id__in=job_sk - user_sk)

        # build suggestions as full objects
        suggestions = {}
        for skill in missing:
            certs = Certification.objects.filter(skills=skill)
            # serialize them
            serializer = CertificationSerializer(certs, many=True)
            suggestions[skill.name] = serializer.data

        payload = {
            "missing_skills": missing,
            "suggestions": suggestions,
        }
        return Response(MissingSerializer(payload).data)



class FacultyProfileDetail(APIView):
    """
    GET /api/faculty/profile/ 
    PUT /api/faculty/profile/   (partial update)
    Only accessible to staff users (is_staff=True).
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        prof = request.user.faculty_profile
        serializer = FacultyProfileSerializer(prof)
        return Response(serializer.data)

    def put(self, request):
        prof = request.user.faculty_profile
        serializer = FacultyProfileSerializer(prof, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

