from io import BytesIO
from uuid import uuid4

from django.conf import settings
from django.db.models import F
from django.core.files.base import ContentFile
from PIL import Image, ImageOps
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.throttling import ScopedRateThrottle
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
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
from rest_framework import filters
from rest_framework.authtoken.views import ObtainAuthToken

User = get_user_model()

class SkillListCreate(generics.ListCreateAPIView):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer

    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


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
        return Response(ProfileSerializer(prof, context={"request": request}).data)

    def put(self, request):
        prof = request.user.profile
        serializer = ProfileSerializer(prof, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        prof = request.user.profile
        serializer = ProfileSerializer(prof, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


#
# 3b) /api/profile/avatar/  →  upload (POST, multipart field "avatar") or remove (DELETE) the profile picture
#
class ProfileAvatar(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]
    FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
    MAX_SIDE = 512

    def post(self, request):
        upload = request.FILES.get("avatar")
        if not upload:
            return Response({"detail": "Choose an image to upload."}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > settings.AVATAR_MAX_BYTES:
            return Response({"detail": "Image must be 2 MB or smaller."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            Image.open(upload).verify()  # rejects files that only pretend to be images
            upload.seek(0)
            img = Image.open(upload)
            fmt = img.format
            img = ImageOps.exif_transpose(img)
        except Exception:
            return Response({"detail": "That file isn't a valid image."}, status=status.HTTP_400_BAD_REQUEST)
        if fmt not in self.FORMATS:
            return Response({"detail": "Use a JPG, PNG or WebP image."}, status=status.HTTP_400_BAD_REQUEST)

        # shrink to at most 512px and re-encode, which also strips any embedded metadata
        img.thumbnail((self.MAX_SIDE, self.MAX_SIDE))
        if fmt == "JPEG" or img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB" if fmt == "JPEG" else "RGBA")
        buf = BytesIO()
        img.save(buf, format=fmt, quality=88)

        prof = request.user.profile
        old = prof.avatar.name if prof.avatar else None
        prof.avatar.save(f"{uuid4().hex}.{self.FORMATS[fmt]}", ContentFile(buf.getvalue()), save=True)
        if old:
            prof.avatar.storage.delete(old)
        return Response(ProfileSerializer(prof, context={"request": request}).data)

    def delete(self, request):
        prof = request.user.profile
        if prof.avatar:
            prof.avatar.delete(save=True)
        return Response(ProfileSerializer(prof, context={"request": request}).data)

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
        # newest postings first; older scraped jobs without a date go last
        return qs.order_by(F("date_posted").desc(nulls_last=True), "-id")

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


@method_decorator(csrf_exempt, name="dispatch")
class FacultyEmailAuthToken(APIView):
    """
    POST /api/faculty-token-auth/
    Accepts { email, password } just like EmailAuthToken,
    but only returns a token if user.is_staff==True.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        password = request.data.get("password")
        if not email or not password:
            return Response(
                {"detail": "Email and password required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # look up by email
        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # authenticate via their username
        user = authenticate(
            request, username=user_obj.username, password=password
        )
        if not user or not user.is_staff:
            return Response(
                {"detail": "Invalid credentials or not authorized as faculty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key})

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

# ---------------------------------------------------------------------------
# Passwords: forgot / reset by email, and change while logged in
# ---------------------------------------------------------------------------
def _password_errors(password, user):
    try:
        validate_password(password, user)
    except DjangoValidationError as e:
        return " ".join(e.messages)
    return None


class PasswordResetRequest(APIView):
    """POST {email} → emails a one-time reset link. Same reply whether or not the account exists."""
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        user = User.objects.filter(email__iexact=email, is_active=True).first() if email else None
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{uid}/{token}"
            send_mail(
                "Reset your CareerPath Analyzer password",
                f"Hi {user.first_name or 'there'},\n\n"
                f"Use this link to choose a new password. It works once and expires in 1 hour:\n{link}\n\n"
                "If you didn't ask for this, you can ignore this email.",
                None,
                [user.email],
            )
        return Response({"detail": "If an account exists for that email, a reset link is on its way."})


class PasswordResetConfirm(APIView):
    """POST {uid, token, new_password} → sets the new password and signs out other sessions."""
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        invalid = Response({"detail": "This reset link is invalid or has expired. Request a new one."},
                           status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(request.data.get("uid", ""))))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return invalid
        if not default_token_generator.check_token(user, request.data.get("token", "")):
            return invalid
        password = request.data.get("new_password", "")
        problem = _password_errors(password, user)
        if problem:
            return Response({"detail": problem}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save()  # also invalidates the reset link
        Token.objects.filter(user=user).delete()
        return Response({"detail": "Password updated. You can log in now."})


class PasswordChange(APIView):
    """POST {current_password, new_password} → returns a fresh token so this session stays signed in."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.check_password(request.data.get("current_password", "")):
            return Response({"detail": "Your current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        password = request.data.get("new_password", "")
        problem = _password_errors(password, user)
        if problem:
            return Response({"detail": problem}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save()
        Token.objects.filter(user=user).delete()
        return Response({"detail": "Password changed.", "token": Token.objects.create(user=user).key})
