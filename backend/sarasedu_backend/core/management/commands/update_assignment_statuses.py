"""
Management command to update assignment statuses from 'active' to 'overdue'
based on the current date/time compared to their due dates.

Usage:
    python manage.py update_assignment_statuses
    python manage.py update_assignment_statuses --dry-run  # See what would be updated
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Assignment


class Command(BaseCommand):
    help = 'Update assignment statuses to "overdue" for assignments past their due date'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        # Find all active assignments where due_date has passed
        overdue_assignments = Assignment.objects.filter(
            status='active',
            due_date__lt=now
        )

        count = overdue_assignments.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('✓ No assignments need status updates.'))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(f'DRY RUN: Would update {count} assignment(s) to "overdue":'))
            for assignment in overdue_assignments:
                time_overdue = now - assignment.due_date
                days = time_overdue.days
                hours = time_overdue.seconds // 3600
                self.stdout.write(
                    f'  - ID {assignment.id}: {assignment.title} '
                    f'(due: {assignment.due_date}, overdue by {days}d {hours}h)'
                )
        else:
            # Update the assignments
            updated = overdue_assignments.update(status='overdue')
            
            self.stdout.write(self.style.SUCCESS(f'✓ Successfully updated {updated} assignment(s) to "overdue":'))
            for assignment in overdue_assignments:
                time_overdue = now - assignment.due_date
                days = time_overdue.days
                hours = time_overdue.seconds // 3600
                self.stdout.write(
                    f'  - ID {assignment.id}: {assignment.title} '
                    f'(due: {assignment.due_date}, overdue by {days}d {hours}h)'
                )
