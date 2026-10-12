import shutil
import tempfile
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

MEDIA = tempfile.mkdtemp()


def image_file(name="me.png", size=(1200, 800), fmt="PNG"):
    buf = BytesIO()
    Image.new("RGB", size, (200, 16, 46)).save(buf, format=fmt)
    return SimpleUploadedFile(name, buf.getvalue(), content_type=f"image/{fmt.lower()}")


@override_settings(MEDIA_ROOT=MEDIA)
class ProfileAvatarTests(APITestCase):
    url = "/api/profile/avatar/"

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        user = User.objects.create_user("s@example.com", "s@example.com", "pass-1234-word")
        self.profile = user.profile  # created by the post_save signal
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=user).key}")

    def test_upload_resizes_and_returns_url(self):
        r = self.client.post(self.url, {"avatar": image_file()}, format="multipart")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(r.data["avatar_url"].startswith("http://testserver/media/avatars/"))
        self.profile.refresh_from_db()
        with Image.open(self.profile.avatar.path) as img:
            self.assertLessEqual(max(img.size), 512)

    def test_rejects_too_large(self):
        big = SimpleUploadedFile("big.png", b"0" * (2 * 1024 * 1024 + 1), content_type="image/png")
        r = self.client.post(self.url, {"avatar": big}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_rejects_non_image(self):
        fake = SimpleUploadedFile("evil.png", b"<script>alert(1)</script>", content_type="image/png")
        r = self.client.post(self.url, {"avatar": fake}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_requires_file(self):
        self.assertEqual(self.client.post(self.url, {}, format="multipart").status_code, 400)

    def test_delete_removes_avatar(self):
        self.client.post(self.url, {"avatar": image_file()}, format="multipart")
        r = self.client.delete(self.url)
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.data["avatar_url"])

    def test_requires_login(self):
        self.client.credentials()
        r = self.client.post(self.url, {"avatar": image_file()}, format="multipart")
        self.assertIn(r.status_code, (401, 403))


@override_settings(FRONTEND_URL="http://app.test", EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()  # reset the 5/hour throttle between tests
        self.user = User.objects.create_user("p@example.com", "p@example.com", "Old-pass-2026!", first_name="Pat")

    def reset_link(self):
        from django.core import mail
        self.assertEqual(self.client.post("/api/password-reset/", {"email": "P@example.com"}).status_code, 200)
        link = next(w for w in mail.outbox[-1].body.split() if w.startswith("http://app.test/reset-password/"))
        return link.rstrip("/").split("/")[-2:]

    def test_unknown_email_gets_same_reply_and_no_mail(self):
        from django.core import mail
        r = self.client.post("/api/password-reset/", {"email": "nobody@example.com"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_flow_sets_password_and_link_works_once(self):
        uid, token = self.reset_link()
        Token.objects.create(user=self.user)
        r = self.client.post("/api/password-reset/confirm/", {"uid": uid, "token": token, "new_password": "Brand-new-pass-77"})
        self.assertEqual(r.status_code, 200, r.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Brand-new-pass-77"))
        self.assertFalse(Token.objects.filter(user=self.user).exists())  # other sessions signed out
        again = self.client.post("/api/password-reset/confirm/", {"uid": uid, "token": token, "new_password": "Another-pass-88"})
        self.assertEqual(again.status_code, 400)

    def test_reset_rejects_bad_token_and_weak_password(self):
        uid, token = self.reset_link()
        self.assertEqual(self.client.post("/api/password-reset/confirm/", {"uid": uid, "token": "nope", "new_password": "Brand-new-pass-77"}).status_code, 400)
        self.assertEqual(self.client.post("/api/password-reset/confirm/", {"uid": uid, "token": token, "new_password": "123"}).status_code, 400)

    def test_change_password(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {Token.objects.create(user=self.user).key}")
        bad = self.client.post("/api/password-change/", {"current_password": "wrong", "new_password": "Brand-new-pass-77"})
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post("/api/password-change/", {"current_password": "Old-pass-2026!", "new_password": "Brand-new-pass-77"})
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertTrue(Token.objects.filter(key=ok.data["token"], user=self.user).exists())
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Brand-new-pass-77"))


class JSearchHelperTests(APITestCase):
    """Pure helpers only: no API requests are made."""

    def test_posted_date_from_relative_text(self):
        from datetime import date
        from catalog.jsearch import posted_date
        today = date(2026, 10, 11)
        self.assertEqual(posted_date({"job_posted_at": "3 days ago"}, today), date(2026, 10, 8))
        self.assertEqual(posted_date({"job_posted_at": "11 hours ago"}, today), today)
        self.assertEqual(posted_date({"job_posted_at": "2 weeks ago"}, today), date(2026, 9, 27))
        self.assertEqual(posted_date({"job_posted_at_datetime_utc": "2026-10-01T08:00:00.000Z"}, today), date(2026, 10, 1))
        self.assertIsNone(posted_date({"job_posted_at": "قبل يومين"}, today))

    def test_to_posting_maps_source_link_and_clean_location(self):
        from catalog.jsearch import to_posting
        p = to_posting({"job_id": "abc", "job_title": "Backend Developer", "employer_name": "noon",
                        "job_publisher": "LinkedIn", "job_apply_link": "https://ae.linkedin.com/jobs/view/1",
                        "job_location": "Dubai - United Arab Emirates  •  via LinkedIn", "job_posted_at": "2 days ago"})
        self.assertEqual((p["source"], p["url"], p["location"]), ("LinkedIn", "https://ae.linkedin.com/jobs/view/1", "Dubai - United Arab Emirates"))
        self.assertIsNone(to_posting({"job_title": "no id"}))

    def test_match_skills_whole_words_and_code_names(self):
        from catalog.jsearch import build_skill_index, match_skills
        index = build_skill_index([(1, "Python"), (2, "C++"), (3, "C#"), (4, "Java"), (5, "go"), (6, "mass mailing </ li"), (7, "SQL")])
        found = set(match_skills("We need Python, C++ and SQL. JavaScript is a plus. Let's go!", index))
        self.assertEqual(found, {1, 2, 7})  # not Java (inside JavaScript), not "go", not the HTML fragment

    def test_index_skips_case_duplicates_and_generic_words(self):
        from catalog.jsearch import build_skill_index, match_skills
        index = build_skill_index([(1, "Teamwork"), (2, "teamwork"), (3, "Technology"), (4, "Power BI")])
        self.assertEqual(set(match_skills("teamwork, technology and power bi", index)), {1, 4})
