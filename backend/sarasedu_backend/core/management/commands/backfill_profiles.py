from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ...models import StudentProfile, TeacherProfile, AdminProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Create missing Student/Teacher/Admin profiles for existing users based on their role'

    def handle(self, *args, **options):
        created = 0
        for user in User.objects.all():
            try:
                if user.role == 'student':
                    obj, was_created = StudentProfile.objects.get_or_create(user=user)
                elif user.role == 'teacher':
                    obj, was_created = TeacherProfile.objects.get_or_create(user=user)
                elif user.role == 'admin':
                    obj, was_created = AdminProfile.objects.get_or_create(user=user)
                else:
                    was_created = False
                if was_created:
                    created += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Failed for user {user.id}: {e}'))
        self.stdout.write(self.style.SUCCESS(f'Backfilled profiles. Created {created} new profiles.'))
