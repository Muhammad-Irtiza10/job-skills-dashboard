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
    skills = SkillSerializer(many=True)
    class Meta:
        model = Major
        fields = ["id","name","skills"]

class ProfileSerializer(serializers.ModelSerializer):
    skills = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.all()
    )
    class Meta:
        model = StudentProfile
        fields = ["major","skills"]
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["skills"] = SkillSerializer(instance.skills.all(), many=True).data
        data["major"]  = MajorSerializer(instance.major).data if instance.major else None
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
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ("username","email","password","first_name","last_name")

    def create(self, validated):
        user = User.objects.create_user(
            username=validated["username"],
            email=validated.get("email",""),
            password=validated["password"],
            first_name=validated.get("first_name",""),
            last_name=validated.get("last_name",""),
        )
        # StudentProfile will be auto-created by your post_save signal
        return user



class JobFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobField
        fields = ['id', 'name']

