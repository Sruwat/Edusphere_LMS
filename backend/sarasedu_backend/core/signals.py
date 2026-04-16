from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging

from .models import StudentProfile, TeacherProfile, AdminProfile, UserSettings, Enrollment, Assignment

User = get_user_model()
logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Auto-create a profile row for a user when it's created based on role."""
    if not created:
        return
    try:
        if instance.role == 'student':
            StudentProfile.objects.get_or_create(user=instance)
        elif instance.role == 'teacher':
            TeacherProfile.objects.get_or_create(user=instance)
        elif instance.role == 'admin':
            AdminProfile.objects.get_or_create(user=instance)
    except Exception:
        logger.exception('Failed to create profile for user_id=%s', instance.id)


@receiver(post_save, sender=User)
def create_user_settings(sender, instance, created, **kwargs):
    """Auto-create UserSettings when a user is created."""
    if created:
        try:
            UserSettings.objects.get_or_create(user=instance)
        except Exception:
            logger.exception('Failed to create settings for user_id=%s', instance.id)


@receiver(post_save, sender=Enrollment)
def update_course_enrollments_on_create(sender, instance, created, **kwargs):
    """Update total_enrollments count when an enrollment is created or updated."""
    try:
        course = instance.course
        enrollment_count = Enrollment.objects.filter(course=course).count()
        if course.total_enrollments != enrollment_count:
            course.total_enrollments = enrollment_count
            course.save(update_fields=['total_enrollments'])
    except Exception:
        logger.exception('Failed to update total_enrollments for course_id=%s', instance.course_id)


@receiver(post_delete, sender=Enrollment)
def update_course_enrollments_on_delete(sender, instance, **kwargs):
    """Update total_enrollments count when an enrollment is deleted."""
    try:
        course = instance.course
        enrollment_count = Enrollment.objects.filter(course=course).count()
        if course.total_enrollments != enrollment_count:
            course.total_enrollments = enrollment_count
            course.save(update_fields=['total_enrollments'])
    except Exception:
        logger.exception('Failed to update total_enrollments for course_id=%s', instance.course_id)


@receiver(post_save, sender=Assignment)
def update_assignment_status_on_save(sender, instance, **kwargs):
    """
    Auto-update assignment status to 'overdue' if the due_date has passed
    and status is still 'active'.
    """
    try:
        if instance.status == 'active' and instance.due_date and timezone.now() > instance.due_date:
            # Update only the status field without triggering this signal again
            Assignment.objects.filter(id=instance.id).update(status='overdue')
    except Exception:
        logger.exception('Failed to update status for assignment_id=%s', instance.id)
