from django.core.management.base import BaseCommand
from django.db import connection
from pathlib import Path
from django.contrib.auth import get_user_model
from ...models import (
    Course,
    Lecture,
    StudentProfile,
    TeacherProfile,
    AdminProfile,
    Enrollment,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database by executing docs/sample_data_mysql.sql or using ORM fallbacks.'

    def handle(self, *args, **options):
        repo_root = Path(__file__).resolve().parents[4]
        sql_file = repo_root / 'docs' / 'sample_data_mysql.sql'
        if sql_file.exists():
            sql = sql_file.read_text(encoding='utf-8')
            # Split statements by semicolon - naive but works for simple SQL dumps
            statements = [s.strip() for s in sql.split(';') if s.strip()]
            with connection.cursor() as cursor:
                for stmt in statements:
                    try:
                        cursor.execute(stmt)
                    except Exception as e:
                        self.stderr.write(f'Failed to execute statement: {e}\nStatement: {stmt[:200]}')

        # Also attempt ORM-based seeding for Django-managed tables (safe, idempotent)
        try:
            # Create admin user if not exists
            admin, created = User.objects.get_or_create(
                username='admin', defaults={
                    'email': 'admin@sarasedu.com',
                    'role': 'admin',
                    'is_staff': True,
                    'is_superuser': True,
                }
            )
            if created:
                admin.set_password('adminpass')
                admin.save()
                AdminProfile.objects.get_or_create(user=admin, defaults={'employee_id': 'EMP001', 'position': 'Platform Administrator'})

            # Create sample teachers
            t1, _ = User.objects.get_or_create(username='sarah.johnson', defaults={'email': 'sarah.johnson@sarasedu.com', 'role': 'teacher'})
            t1.set_password('teacherpass')
            t1.save()
            TeacherProfile.objects.get_or_create(user=t1, defaults={'employee_id': 'TEACH001', 'department': 'Mathematics'})

            t2, _ = User.objects.get_or_create(username='michael.chen', defaults={'email': 'michael.chen@sarasedu.com', 'role': 'teacher'})
            t2.set_password('teacherpass')
            t2.save()
            TeacherProfile.objects.get_or_create(user=t2, defaults={'employee_id': 'TEACH002', 'department': 'Physics'})

            # Create sample students
            s1, _ = User.objects.get_or_create(username='john.doe', defaults={'email': 'john.doe@student.com', 'role': 'student'})
            s1.set_password('studentpass')
            s1.save()
            StudentProfile.objects.get_or_create(user=s1, defaults={'roll_number': 'CS001', 'grade_level': '12'})

            s2, _ = User.objects.get_or_create(username='jane.smith', defaults={'email': 'jane.smith@student.com', 'role': 'student'})
            s2.set_password('studentpass')
            s2.save()
            StudentProfile.objects.get_or_create(user=s2, defaults={'roll_number': 'CS002', 'grade_level': '12'})

            # Create sample courses
            c1, _ = Course.objects.get_or_create(title='Advanced Mathematics', defaults={'instructor': t1, 'status': 'active', 'is_published': True, 'total_lectures': 10})
            c2, _ = Course.objects.get_or_create(title='Physics Fundamentals', defaults={'instructor': t2, 'status': 'active', 'is_published': True, 'total_lectures': 8})

            # Create enrollments
            Enrollment.objects.get_or_create(student=s1, course=c1, defaults={'status': 'active', 'progress_percentage': 10})
            Enrollment.objects.get_or_create(student=s2, course=c1, defaults={'status': 'active', 'progress_percentage': 5})

            self.stdout.write(self.style.SUCCESS('ORM seeding complete.'))
        except Exception as e:
            self.stderr.write(f'ORM seeding failed: {e}')

        self.stdout.write(self.style.SUCCESS('Database seeding complete.'))
