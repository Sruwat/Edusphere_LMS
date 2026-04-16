# Generated migration to align DB types with Django model field types
# Based on HANDOVER_SCHEMA_DIFF.md type mismatches
# This is a draft for review - test on non-production DB before applying

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        # User model type alignments
        migrations.AlterField(
            model_name='user',
            name='is_superuser',
            field=models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status'),
        ),
        migrations.AlterField(
            model_name='user',
            name='is_staff',
            field=models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status'),
        ),
        migrations.AlterField(
            model_name='user',
            name='is_active',
            field=models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active'),
        ),

        # StudentProfile model type alignments
        migrations.AlterField(
            model_name='studentprofile',
            name='average_grade',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),

        # TeacherProfile model type alignments
        migrations.AlterField(
            model_name='teacherprofile',
            name='average_rating',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=3),
        ),

        # Course model type alignments
        migrations.AlterField(
            model_name='course',
            name='duration_weeks',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='course',
            name='price',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AlterField(
            model_name='course',
            name='allow_discussions',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='course',
            name='require_approval',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='course',
            name='is_published',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='course',
            name='total_lectures',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='course',
            name='average_rating',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=3),
        ),
        migrations.AlterField(
            model_name='course',
            name='total_enrollments',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='course',
            name='revenue',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),

        # Lecture model type alignments
        migrations.AlterField(
            model_name='lecture',
            name='duration_minutes',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='lecture',
            name='order_index',
            field=models.IntegerField(),
        ),
        migrations.AlterField(
            model_name='lecture',
            name='is_published',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='lecture',
            name='is_free_preview',
            field=models.BooleanField(default=False),
        ),

        # LectureMaterial model type alignments
        migrations.AlterField(
            model_name='lecturematerial',
            name='file_size_kb',
            field=models.IntegerField(blank=True, null=True),
        ),

        # CourseSchedule model type alignments
        migrations.AlterField(
            model_name='courseschedule',
            name='is_active',
            field=models.BooleanField(default=True),
        ),

        # StudyMaterial model type alignments
        migrations.AlterField(
            model_name='studymaterial',
            name='file_size_kb',
            field=models.IntegerField(blank=True, null=True),
        ),

        # Enrollment model type alignments
        migrations.AlterField(
            model_name='enrollment',
            name='progress_percentage',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AlterField(
            model_name='enrollment',
            name='final_grade',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name='enrollment',
            name='certificate_issued',
            field=models.BooleanField(default=False),
        ),

        # LectureProgress model type alignments
        migrations.AlterField(
            model_name='lectureprogress',
            name='watch_time_minutes',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='lectureprogress',
            name='last_position_seconds',
            field=models.IntegerField(default=0),
        ),

        # Assignment model type alignments
        migrations.AlterField(
            model_name='assignment',
            name='total_marks',
            field=models.DecimalField(decimal_places=2, max_digits=10),
        ),
        migrations.AlterField(
            model_name='assignment',
            name='word_limit',
            field=models.IntegerField(blank=True, null=True),
        ),

        # AssignmentSubmission model type alignments
        migrations.AlterField(
            model_name='assignmentsubmission',
            name='marks_obtained',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),

        # AssignmentAttachment model type alignments
        migrations.AlterField(
            model_name='assignmentattachment',
            name='file_size_kb',
            field=models.IntegerField(blank=True, null=True),
        ),

        # Test model type alignments
        migrations.AlterField(
            model_name='test',
            name='duration_minutes',
            field=models.IntegerField(),
        ),
        migrations.AlterField(
            model_name='test',
            name='total_marks',
            field=models.DecimalField(decimal_places=2, max_digits=10),
        ),
        migrations.AlterField(
            model_name='test',
            name='randomize_questions',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='test',
            name='show_results_immediately',
            field=models.BooleanField(default=False),
        ),

        # Question model type alignments
        migrations.AlterField(
            model_name='question',
            name='marks',
            field=models.DecimalField(decimal_places=2, max_digits=5),
        ),
        migrations.AlterField(
            model_name='question',
            name='order_index',
            field=models.IntegerField(blank=True, null=True),
        ),

        # TestSubmission model type alignments
        migrations.AlterField(
            model_name='testsubmission',
            name='marks_obtained',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AlterField(
            model_name='testsubmission',
            name='time_taken_minutes',
            field=models.IntegerField(blank=True, null=True),
        ),

        # TestAnswer model type alignments
        migrations.AlterField(
            model_name='testanswer',
            name='is_correct',
            field=models.BooleanField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='testanswer',
            name='marks_awarded',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name='testanswer',
            name='marked',
            field=models.BooleanField(default=False),
        ),

        # LibraryItem model type alignments
        migrations.AlterField(
            model_name='libraryitem',
            name='file_size_kb',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='libraryitem',
            name='duration_minutes',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='libraryitem',
            name='pages',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='libraryitem',
            name='total_downloads',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='libraryitem',
            name='average_rating',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=3),
        ),
        migrations.AlterField(
            model_name='libraryitem',
            name='is_featured',
            field=models.BooleanField(default=False),
        ),
    ]
