from rest_framework import serializers
from .models import Major, Skill, JobPosting, StudentProfile, Certification, FacultyProfile
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import JobField

User = get_user_model()

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["id","name"]

class MajorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Major
        fields = ["id","name","department","description"]

class MajorSkillsSerializer(serializers.ModelSerializer):
    major_related_skills = serializers.SerializerMethodField()
    technical_skills     = serializers.SerializerMethodField()
    soft_skills          = serializers.SerializerMethodField()

    class Meta:
        model  = Major
        fields = ["id", "name",
                  "major_related_skills",
                  "technical_skills",
                  "soft_skills"]

    def get_major_related_skills(self, major):
        qs = major.skills.filter(category='major')
        return SkillSerializer(qs, many=True).data

    def get_technical_skills(self, major):
        qs = major.skills.filter(category='technical')
        return SkillSerializer(qs, many=True).data

    def get_soft_skills(self, major):
        qs = major.skills.filter(category='soft')
        return SkillSerializer(qs, many=True).data


class ProfileSerializer(serializers.ModelSerializer):
    skills = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Skill.objects.all()
    )
    first_name = serializers.CharField(source="user.first_name")
    last_name  = serializers.CharField(source="user.last_name")
    email      = serializers.EmailField(source="user.email")

    class Meta:
        model  = StudentProfile
        fields = [ "first_name", "last_name", "email",
            "company_name", "job_title", "other_job_title",
            "bio", "phone_primary", "phone_secondary", "phone_work",
            "major", "skills",]
    
    def update(self, instance, validated_data):
        # Pull out any user-specific data
        user_data = validated_data.pop("user", {})

        # Update the User object
        user = instance.user
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save()

        # Let DRF handle the rest of the profile fields
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['major']  = MajorSerializer(instance.major).data if instance.major else None
        data['skills'] = SkillSerializer(instance.skills.all(), many=True).data
        data['company_name']    = instance.company_name
        data['job_title']       = instance.job_title
        data['other_job_title'] = instance.other_job_title
        data['bio']             = instance.bio
        data['phone_primary']   = instance.phone_primary
        data['phone_secondary'] = instance.phone_secondary
        data['phone_work']      = instance.phone_work
        return data
    
class JobPostingSerializer(serializers.ModelSerializer):
    skills = SkillSerializer(many=True)
    job_field = serializers.CharField(source='job_field.name', read_only=True)

    class Meta:
        model = JobPosting
        fields = ["id","title","company_name","location","skills", "job_field"]

class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ["id", "name", "provider", "url", "relevance_score"]

class MissingSerializer(serializers.Serializer):
    missing_skills = SkillSerializer(many=True)
    # suggestions is a dict: skill_name -> list of CertificationSerializer
    suggestions = serializers.DictField(
        child=CertificationSerializer(many=True)
    )

class FacultyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacultyProfile
        fields = [
            "user",           # returns the user’s ID (or you can expand to user.email if you prefer)
            # any extra FacultyProfile fields you might add, e.g.
            # "department",
        ]
        read_only_fields = ["user"]

class RegisterSerializer(serializers.ModelSerializer):
    first_name       = serializers.CharField()
    last_name        = serializers.CharField()
    company_name     = serializers.CharField(write_only=True, required=False, allow_blank=True)
    job_title        = serializers.ChoiceField(write_only=True, choices=StudentProfile.JOB_TITLE_CHOICES)
    other_job_title  = serializers.CharField(write_only=True, required=False, allow_blank=True)
    bio              = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone_primary    = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone_secondary  = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone_work       = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
          'username','email','password',
          'first_name','last_name','company_name','job_title','other_job_title',
            'bio','phone_primary','phone_secondary','phone_work',
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # 1) Pop off user‐fields
        username  = validated_data.pop("username")
        email     = validated_data.pop("email")
        password  = validated_data.pop("password")
        first     = validated_data.pop("first_name", "")
        last      = validated_data.pop("last_name", "")

        # 2) Create the User
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first,
            last_name=last,
        )

        # 3) Build or update the StudentProfile
        StudentProfile.objects.update_or_create(
            user=user,
            defaults={
                "company_name":     validated_data.pop("company_name", ""),
                "job_title":        validated_data.pop("job_title", ""),
                "other_job_title":  validated_data.pop("other_job_title", ""),
                "bio":              validated_data.pop("bio", ""),
                "phone_primary":    validated_data.pop("phone_primary", ""),
                "phone_secondary":  validated_data.pop("phone_secondary", ""),
                "phone_work":       validated_data.pop("phone_work", ""),
            }
        )

        return user

class JobFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobField
        fields = ['id', 'name']


