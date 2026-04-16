from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import AdminProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a superuser and admin profile'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='admin')
        parser.add_argument('--email', default='admin@sarasedu.local')
        parser.add_argument('--password', default='adminpass')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'User {username} already exists'))
            return

        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role='admin'
        )

        AdminProfile.objects.create(
            user=user,
            employee_id='ADM001',
            position='System Administrator',
            access_level='full'
        )

        self.stdout.write(self.style.SUCCESS(f'Superuser {username} created successfully'))
