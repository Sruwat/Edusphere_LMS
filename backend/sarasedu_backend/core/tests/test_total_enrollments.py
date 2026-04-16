from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from core.models import Course, Enrollment

User = get_user_model()


class TotalEnrollmentsTestCase(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teacher1',
            email='teacher1@test.com',
            password='testpass123',
            role='teacher',
        )
        self.student1 = User.objects.create_user(
            username='student1',
            email='student1@test.com',
            password='testpass123',
            role='student',
        )
        self.student2 = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='testpass123',
            role='student',
        )
        self.student3 = User.objects.create_user(
            username='student3',
            email='student3@test.com',
            password='testpass123',
            role='student',
        )
        self.course = Course.objects.create(
            title='Test Course',
            instructor=self.teacher,
            status='active',
            is_published=True,
        )

    def test_enrollment_creation_updates_count(self):
        self.assertEqual(self.course.total_enrollments, 0)

        Enrollment.objects.create(student=self.student1, course=self.course, status='active')
        self.course.refresh_from_db()
        self.assertEqual(self.course.total_enrollments, 1)

        Enrollment.objects.create(student=self.student2, course=self.course, status='active')
        self.course.refresh_from_db()
        self.assertEqual(self.course.total_enrollments, 2)

        Enrollment.objects.create(student=self.student3, course=self.course, status='active')
        self.course.refresh_from_db()
        self.assertEqual(self.course.total_enrollments, 3)

    def test_enrollment_deletion_updates_count(self):
        enrollment1 = Enrollment.objects.create(student=self.student1, course=self.course, status='active')
        enrollment2 = Enrollment.objects.create(student=self.student2, course=self.course, status='active')

        self.course.refresh_from_db()
        self.assertEqual(self.course.total_enrollments, 2)

        enrollment1.delete()
        self.course.refresh_from_db()
        self.assertEqual(self.course.total_enrollments, 1)

        enrollment2.delete()
        self.course.refresh_from_db()
        self.assertEqual(self.course.total_enrollments, 0)

    def test_management_command_updates_count(self):
        Enrollment.objects.create(student=self.student1, course=self.course)
        Enrollment.objects.create(student=self.student2, course=self.course)

        Course.objects.filter(id=self.course.id).update(total_enrollments=0)
        self.course.refresh_from_db()
        self.assertEqual(self.course.total_enrollments, 0)

        call_command('update_total_enrollments', '--course-id', self.course.id)

        self.course.refresh_from_db()
        self.assertEqual(self.course.total_enrollments, 2)
