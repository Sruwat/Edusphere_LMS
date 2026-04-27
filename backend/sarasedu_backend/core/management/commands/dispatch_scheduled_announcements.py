from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from core.announcement_delivery import dispatch_announcement
from core.models import Announcement


class Command(BaseCommand):
    help = 'Dispatch due announcements that have not been sent yet.'

    def handle(self, *args, **options):
        due_announcements = Announcement.objects.filter(
            is_archived=False,
            dispatched_at__isnull=True,
        ).filter(
            Q(scheduled_for__isnull=True) | Q(scheduled_for__lte=timezone.now())
        ).order_by('created_at')

        count = 0
        for announcement in due_announcements:
            result = dispatch_announcement(announcement)
            self.stdout.write(f'Announcement {announcement.id}: {result["status"]}')
            if result['status'] == 'dispatched':
                count += 1

        self.stdout.write(self.style.SUCCESS(f'Dispatched {count} announcement(s).'))
