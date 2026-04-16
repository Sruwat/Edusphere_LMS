from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from datetime import timedelta

from core.models import Assignment, Course, Notification

User = get_user_model()


class SubmissionAnnouncementUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username='teacher1',
            email='teacher1@example.com',
            password='StrongPass123!',
            role='teacher',
        )
        self.student = User.objects.create_user(
            username='student1',
            email='student1@example.com',
            password='StrongPass123!',
            role='student',
        )
        self.course = Course.objects.create(
            title='Maths',
            instructor=self.teacher,
            status='active',
            is_published=True,
        )
        self.assignment = Assignment.objects.create(
            course=self.course,
            title='Worksheet',
            due_date=timezone.now() + timedelta(days=30),
            total_marks=100,
            created_by=self.teacher,
        )

    def test_student_submission_create_then_update(self):
        self.client.force_authenticate(user=self.student)

        create_response = self.client.post(
            '/api/assignment-submissions/',
            {'assignment': self.assignment.id, 'submission_text': 'first pass'},
            format='multipart',
        )
        self.assertEqual(create_response.status_code, 201)

        update_response = self.client.post(
            '/api/assignment-submissions/',
            {'assignment': self.assignment.id, 'submission_text': 'second pass'},
            format='multipart',
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data['submission_text'], 'second pass')

    def test_teacher_can_create_announcement(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(
            '/api/announcements/',
            {'title': 'Exam notice', 'body': 'Exam moved to Friday', 'channels': []},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['title'], 'Exam notice')

    def test_upload_endpoint_returns_url(self):
        self.client.force_authenticate(user=self.teacher)
        upload = SimpleUploadedFile('notes.pdf', b'%PDF-1.4 sample', content_type='application/pdf')
        response = self.client.post('/api/uploads/', {'file': upload}, format='multipart')
        self.assertEqual(response.status_code, 201)
        self.assertIn('url', response.data)

    def test_notification_delete_all_endpoint_exists(self):
        Notification.objects.create(user=self.student, title='One', message='First')
        Notification.objects.create(user=self.student, title='Two', message='Second')
        self.client.force_authenticate(user=self.student)

        response = self.client.delete('/api/notifications/delete-all/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Notification.objects.filter(user=self.student).count(), 0)
