from django.core.management.base import BaseCommand
from django.db.models import Count
from ...models import Course, Enrollment


class Command(BaseCommand):
    help = 'Update total_enrollments field in courses based on actual enrollment count'

    def add_arguments(self, parser):
        parser.add_argument(
            '--course-id',
            type=int,
            help='Update only a specific course by ID',
        )

    def handle(self, *args, **options):
        course_id = options.get('course_id')
        
        if course_id:
            # Update a specific course
            try:
                course = Course.objects.get(id=course_id)
                enrollment_count = Enrollment.objects.filter(course=course).count()
                course.total_enrollments = enrollment_count
                course.save(update_fields=['total_enrollments'])
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Updated course "{course.title}" (ID: {course.id}) - '
                        f'total_enrollments: {enrollment_count}'
                    )
                )
            except Course.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Course with ID {course_id} does not exist')
                )
        else:
            # Update all courses
            courses = Course.objects.all()
            updated_count = 0
            
            for course in courses:
                enrollment_count = Enrollment.objects.filter(course=course).count()
                if course.total_enrollments != enrollment_count:
                    course.total_enrollments = enrollment_count
                    course.save(update_fields=['total_enrollments'])
                    updated_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Updated course "{course.title}" (ID: {course.id}) - '
                            f'total_enrollments: {enrollment_count}'
                        )
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nCompleted! Updated {updated_count} course(s) out of {courses.count()} total courses.'
                )
            )
