from django.db import connection
import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from faker import Faker
from catalog.models import (
    Major, Skill, JobField, JobPosting,
    Course, Certification,
    StudentProfile, FacultyProfile,
)

fake = Faker()

MAJOR_TO_JOBFIELDS = {
    "Mass Communication": [
        "Content Writer", "Social Media Manager", "Journalist",
        "Public Relations Specialist", "Media Coordinator",
    ],
    "Biotechnology": [
        "Biotechnologist", "Biomedical Researcher",
        "Quality Control Analyst", "Lab Technician",
        "Regulatory Affairs Associate",
    ],
    "Business Administration": [
        "Financial Analyst", "Marketing Analyst", "HR Specialist",
        "Operations Manager", "Business Development Manager",
        "Supply Chain Analyst",
    ],
    "Architecture": [
        "Architect", "Urban Planner", "Landscape Architect",
        "Interior Designer", "BIM Coordinator",
    ],
    "Artificial Intelligence": [
        "Machine Learning Engineer", "Data Scientist",
        "AI Researcher", "NLP Engineer", "Computer Vision Engineer",
        "AI Strategist", "Machine Learning Ops Engineer",
    ],
    "Chemical Engineering": [
        "Process Engineer", "R&D Engineer", "Safety Engineer",
        "Quality Control Engineer", "Environmental Engineer",
    ],
    "Civil and Infrastructure Engineering": [
        "Structural Engineer", "Transportation Engineer",
        "Geotechnical Engineer", "Construction Project Engineer",
    ],
    "Computer Engineering": [
        "Embedded Systems Engineer", "Hardware Engineer",
        "Firmware Engineer", "IoT Engineer", "Systems Architect",
    ],
    "Computer Science": [
        "Software Engineer", "Backend Developer",
        "Frontend Developer", "Full Stack Developer",
        "DevOps Engineer", "Data Engineer",
    ],
    "Electrical and Electronics Engineering": [
        "Electronics Engineer", "Electrical Design Engineer",
        "Embedded Systems Engineer", "Control Systems Engineer",
        "Power Systems Engineer",
    ],
    "Mechanical Engineering": [
        "Mechanical Design Engineer", "Manufacturing Engineer",
        "HVAC Engineer", "Automotive Engineer", "Robotics Engineer",
    ],
    "Petroleum Engineering": [
        "Reservoir Engineer", "Production Engineer",
        "Drilling Engineer", "Petroleum Geologist",
    ],
    "Interior Design": [
        "Interior Designer", "Space Planner", "Lighting Designer",
    ],
}

def create_learnings_for_skill(skill, major):
    courses = []
    certs = []

    for i in range(2):
        code = f"SKL-{skill.name[:3].upper()}-{i+1}"
        course = Course.objects.create(
            name=f"{skill.name} Fundamentals: Part {i+1}",
            description=fake.paragraph(nb_sentences=3),
            major=major,
            code=code
        )
        course.skills.add(skill)
        courses.append(course)

    for i in range(2):
        provider = random.choice(["Coursera", "edX", "Udemy", "Pluralsight"])
        cert_name = f"{skill.name} ({major.name}) Certification {i+1}"
        cert = Certification.objects.create(
            name=cert_name,
            provider=provider,
            url=f"https://example.com/{skill.name.lower()}-{major.name.lower().replace(' ', '-')}-cert-{i+1}",
        )
        cert.skills.add(skill)
        certs.append(cert)

    return courses, certs

class Command(BaseCommand):
    help = "Wipe & generate full test data set"

    def handle(self, *args, **opts):
        
        # Step 1: Delete all non-superuser users
        #User.objects.exclude(is_superuser=True).delete()

        # Step 2: Delete profiles first
        #StudentProfile.objects.all().delete()
        #FacultyProfile.objects.all().delete()
        #self.stdout.write("🗑  Clearing old data…")
        #User.objects.exclude(id=1).delete()
        #StudentProfile.objects.all().delete()
        #FacultyProfile.objects.all().delete()

        #with connection.cursor() as cursor:
            # This will remove all users AND related student/faculty profiles
            #cursor.execute("TRUNCATE auth_user, catalog_studentprofile, catalog_facultyprofile CASCADE;")
            #cursor.execute("ALTER SEQUENCE auth_user_id_seq RESTART WITH 1;")
            #cursor.execute("ALTER SEQUENCE catalog_studentprofile_id_seq RESTART WITH 1;")
            #cursor.execute("ALTER SEQUENCE catalog_facultyprofile_id_seq RESTART WITH 1;")

        

        # Step 3: Delete all other app models in correct order
        for m in [
            JobPosting,
            JobField,
            Certification,
            Course,
            Major,
            Skill,
        ]:
            m.objects.all().delete()

        # 1) Majors
        majors = []
        for name in MAJOR_TO_JOBFIELDS.keys():
            title = f"Bachelor of Science in {name}" \
                if "Bachelor of" not in name else name
            majors.append(Major.objects.create(name=title))
        self.stdout.write(f"✅ {len(majors)} Majors created")

        # 2) Skills
        skill_names = {
            "Computer Science": ["Python","Django","React","SQL","Algorithms","Data Structures"],
            "Business Administration": ["Excel","SQL","Power BI","Marketing","Strategy"],
            "Biotechnology": ["PCR","Cell Culture","Genomics","Bioinformatics"],
            "Architecture": ["AutoCAD","Revit","3D Modeling","Site Analysis"],
            "Mass Communication": ["Copywriting","Video Editing","SEO","Analytics"],
        }
        skills = []
        for majename, names in skill_names.items():
            for n in names:
                skill_obj, _ = Skill.objects.get_or_create(name=n)
                skills.append(skill_obj)
        self.stdout.write(f"✅ {len(skills)} Skills created")

        # 3) Link Majors ↔ Skills
        for major in majors:
            key = major.name.replace("Bachelor of Science in ", "")
            names = skill_names.get(key, [])
            related = [s for s in skills if s.name in names]
            major.skills.set(related)
        self.stdout.write("✅ Majors linked to their Skills")

        # 4) JobFields
        jobfields = []
        for name in MAJOR_TO_JOBFIELDS:
            jobfields.append(JobField.objects.create(name=name))
        self.stdout.write(f"✅ {len(jobfields)} JobFields created")

        # 5) JobPostings
        postings = []
        for major_name, titles in MAJOR_TO_JOBFIELDS.items():
            jf = JobField.objects.get(name=major_name)
            maj = Major.objects.get(name=f"Bachelor of Science in {major_name}")
            for title in titles:
                post = JobPosting.objects.create(
                    title=title,
                    company_name=fake.company(),
                    location=f"{fake.city()}, {fake.country_code()}",
                    job_field=jf
                )
                post.skills.set(
                    random.sample(
                        list(maj.skills.all()),
                        k=min(5, maj.skills.count())
                    )
                )
                postings.append(post)
        self.stdout.write(f"✅ {len(postings)} JobPostings created")

        # 6) Courses & Certifications per Skill per Major
        total_courses = total_certs = 0
        for major in majors:
            for skill in major.skills.all():
                crs, certs = create_learnings_for_skill(skill, major)
                total_courses += len(crs)
                total_certs += len(certs)
        self.stdout.write(f"✅ {total_courses} Courses & {total_certs} Certifications created")

        # 7) Student users + profiles
        #fake.unique.clear()
        #for _ in range(10):
         #   email = fake.unique.email()
          #  user = User.objects.create_user(
          #      username=email, email=email, password="password123",
          #      first_name=fake.first_name(), last_name=fake.last_name(),
          #      is_staff=False
          #  )
          #  prof = StudentProfile.objects.create(user=user)
          #  maj = random.choice(majors)
          #  prof.major = maj
          #  prof.skills.set(random.sample(list(maj.skills.all()), k=random.randint(3,6)))
          #  prof.save()
       # self.stdout.write("✅ 10 Student accounts + profiles created")

        # 8) Faculty users + profiles
        #for _ in range(2):
         #   email = fake.unique.company_email()
         #   user = User.objects.create_user(
         #      username=email, email=email, password="password123",
         #       first_name=fake.first_name(), last_name=fake.last_name(),
         #       is_staff=True
         #   )
         #   FacultyProfile.objects.create(user=user)
        #self.stdout.write("✅ 2 Faculty accounts + profiles created")

        self.stdout.write(self.style.SUCCESS("🎉 Test data successfully generated!"))
