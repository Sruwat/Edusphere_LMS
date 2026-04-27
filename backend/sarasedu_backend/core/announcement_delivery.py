import logging

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Notification, User


logger = logging.getLogger(__name__)


def _get_recipient_queryset(announcement):
    audience = (announcement.audience or 'all').lower()
    if audience == 'students':
        return User.objects.filter(role='student')
    if audience == 'teachers':
        return User.objects.filter(role='teacher')
    return User.objects.all()


def dispatch_announcement(announcement, *, log=None):
    """
    Deliver an announcement exactly once when it is due.
    """
    active_logger = log or logger

    if announcement.dispatched_at:
        return {'status': 'already_dispatched'}

    if announcement.is_archived:
        return {'status': 'archived'}

    if announcement.scheduled_for and announcement.scheduled_for > timezone.now():
        return {'status': 'scheduled_for_future'}

    channels = list(announcement.channels or [])
    recipients = _get_recipient_queryset(announcement)

    if 'in-app' in channels:
        existing_notification_user_ids = set(
            Notification.objects.filter(
                related_object_type='announcement',
                related_object_id=announcement.id,
            ).values_list('user_id', flat=True)
        )
        notifications = [
            Notification(
                user=user,
                notification_type='announcement',
                title=announcement.title,
                message=announcement.body,
                related_object_type='announcement',
                related_object_id=announcement.id,
            )
            for user in recipients.iterator()
            if user.id not in existing_notification_user_ids
        ]
        if notifications:
            Notification.objects.bulk_create(notifications, batch_size=500)

    if 'email' in channels:
        recipient_emails = list(filter(None, set(
            recipients.exclude(email__isnull=True).exclude(email='').values_list('email', flat=True)
        )))
        if recipient_emails:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'no-reply@example.com'
            batch_size = getattr(settings, 'ANNOUNCEMENT_EMAIL_BATCH_SIZE', 100)
            for index in range(0, len(recipient_emails), batch_size):
                batch = recipient_emails[index:index + batch_size]
                try:
                    send_mail(
                        announcement.title or 'Announcement',
                        announcement.body or '',
                        from_email,
                        batch,
                        fail_silently=False,
                    )
                except Exception as exc:
                    active_logger.error('Failed to send announcement email batch starting at %s: %s', index, exc)

    if 'sms' in channels:
        tw_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        tw_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        tw_from = getattr(settings, 'TWILIO_FROM_NUMBER', None)
        if tw_sid and tw_token and tw_from:
            phone_numbers = recipients.exclude(phone__isnull=True).exclude(phone='').values_list('phone', flat=True)
            for phone in phone_numbers:
                try:
                    response = requests.post(
                        f'https://api.twilio.com/2010-04-01/Accounts/{tw_sid}/Messages.json',
                        data={'From': tw_from, 'To': phone, 'Body': announcement.body or announcement.title},
                        auth=(tw_sid, tw_token),
                        timeout=10,
                    )
                    if response.status_code >= 400:
                        active_logger.warning('Twilio SMS send failed for %s status=%s', phone, response.status_code)
                except Exception:
                    active_logger.exception('Error sending SMS to %s', phone)
        else:
            active_logger.warning('SMS channel requested but Twilio is not configured')

    announcement.dispatched_at = timezone.now()
    announcement.save(update_fields=['dispatched_at'])
    return {'status': 'dispatched'}
