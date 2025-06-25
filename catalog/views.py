from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models      import StudentProfile as Profile, Major, JobPosting, Skill, Certification, JobField
from .serializers import (
    MajorSerializer,
    MajorSkillsSerializer,
    ProfileSerializer,
    JobPostingSerializer,
    MissingSerializer,
    SkillSerializer, 
    CertificationSerializer,
    FacultyProfileSerializer,
    RegisterSerializer,
    JobFieldSerializer,
)

from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from django.contrib.auth import authenticate, get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.authtoken.models import Token


class JobFieldList(generics.ListAPIView):
    queryset = JobField.objects.all()
    serializer_class = JobFieldSerializer

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
        """
        Allow:
          - ?title=<substring>
          - ?job_field=<exact name of job field>
        """
        qs = JobPosting.objects.all()
        title = self.request.query_params.get("title", "").strip()
        job_field = self.request.query_params.get("job_field", "").strip()
        if title:
            qs = qs.filter(title__icontains=title)
        if job_field:
            # filter by job_field name (case-insensitive)
            qs = qs.filter(job_field__name__iexact=job_field)
        return qs

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




class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class EmailAuthToken(APIView):
    """
    Custom token auth view: accept email & password, return token.
    """
    authentication_classes = []  # no auth needed to access this
    permission_classes = [AllowAny]      # allow any

    @method_decorator(csrf_exempt, name='dispatch')
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response(
                {'detail': 'Email and password required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        User = get_user_model()
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Invalid credentials.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Now authenticate: default authenticate() uses username field:
        user = authenticate(request, username=user_obj.username, password=password)
        if not user:
            return Response(
                {'detail': 'Invalid credentials.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key})