from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Course, Enrollment

User = get_user_model()


class AuthAndPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username='student1',
            email='student1@example.com',
            password='StrongPass123!',
            role='student',
        )

    def test_auth_me_requires_authentication(self):
        response = self.client.get('/api/auth/me')
        self.assertIn(response.status_code, (401, 403))

    def test_login_returns_user_payload(self):
        response = self.client.post(
            '/api/auth/login',
            {'username': 'student1', 'password': 'StrongPass123!'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'student1')

    def test_login_accepts_email_identifier(self):
        response = self.client.post(
            '/api/auth/login',
            {'email': 'student1@example.com', 'password': 'StrongPass123!'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['email'], 'student1@example.com')

    def test_user_list_requires_authentication(self):
        response = self.client.get('/api/users')
        self.assertIn(response.status_code, (401, 403))

    def test_library_create_requires_authentication(self):
        response = self.client.post(
            '/api/library',
            {'title': 'Guide', 'item_type': 'Document'},
            format='json',
        )
        self.assertIn(response.status_code, (401, 403))


class EnrollmentVisibilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username='teacher1',
            email='teacher1@example.com',
            password='StrongPass123!',
            role='teacher',
        )
        self.other_teacher = User.objects.create_user(
            username='teacher2',
            email='teacher2@example.com',
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
            title='Physics',
            instructor=self.teacher,
            status='active',
            is_published=True,
        )
        Enrollment.objects.create(student=self.student, course=self.course, status='active')

    def test_teacher_sees_only_own_course_enrollments(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get('/api/enrollments/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)

    def test_other_teacher_does_not_see_unrelated_enrollments(self):
        self.client.force_authenticate(user=self.other_teacher)
        response = self.client.get('/api/enrollments/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 0)

    def test_student_sees_only_own_enrollments(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/enrollments/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
