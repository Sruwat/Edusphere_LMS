from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Course, Enrollment
from forum.models import Post, Thread

User = get_user_model()


class ForumWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username="forumteacher",
            email="forumteacher@example.com",
            password="StrongPass123!",
            role="teacher",
        )
        self.student = User.objects.create_user(
            username="forumstudent",
            email="forumstudent@example.com",
            password="StrongPass123!",
            role="student",
        )
        self.other_student = User.objects.create_user(
            username="outsider",
            email="outsider@example.com",
            password="StrongPass123!",
            role="student",
        )
        self.course = Course.objects.create(
            title="Forum Course",
            instructor=self.teacher,
            status="active",
            is_published=True,
            allow_discussions=True,
        )
        Enrollment.objects.create(student=self.student, course=self.course, status="active")

    def test_enrolled_student_can_create_thread(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            "/api/forum/threads/",
            {"course_id": self.course.id, "title": "Need help", "body": "How do I solve question 2?"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Thread.objects.count(), 1)

    def test_unenrolled_student_cannot_create_thread(self):
        self.client.force_authenticate(user=self.other_student)
        response = self.client.post(
            "/api/forum/threads/",
            {"course_id": self.course.id, "title": "I should fail", "body": "No access"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_teacher_can_lock_and_hide_post(self):
        thread = Thread.objects.create(course=self.course, created_by=self.student, title="Question", body="Body")
        post = Post.objects.create(thread=thread, author=self.student, body="Reply")
        self.client.force_authenticate(user=self.teacher)

        lock_response = self.client.post(f"/api/forum/threads/{thread.id}/lock/")
        hide_response = self.client.post(f"/api/forum/posts/{post.id}/hide/")

        self.assertEqual(lock_response.status_code, 200)
        self.assertEqual(hide_response.status_code, 200)
        thread.refresh_from_db()
        post.refresh_from_db()
        self.assertTrue(thread.is_locked)
        self.assertTrue(post.is_hidden)
