from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import UserSettings

User = get_user_model()


class Command(BaseCommand):
    help = 'Create UserSettings for all users that do not have settings yet'

    def handle(self, *args, **options):
        users_without_settings = User.objects.filter(settings__isnull=True)
        count = users_without_settings.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('All users already have settings.'))
            return
        
        self.stdout.write(f'Found {count} users without settings. Creating...')
        
        created_count = 0
        for user in users_without_settings:
            try:
                UserSettings.objects.create(user=user)
                created_count += 1
                self.stdout.write(f'Created settings for user: {user.username}')
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Failed to create settings for user {user.username}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created settings for {created_count} users.')
        )
