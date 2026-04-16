from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    avatar_url = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)


class StudentProfile(models.Model):
    # Use primary_key so the profile shares the same PK as the User (one-to-one with same id)
    user = models.OneToOneField('core.User', on_delete=models.CASCADE, related_name='student_profile', primary_key=True)
    roll_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    grade_level = models.CharField(max_length=20, blank=True, null=True)
    parent_contact = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    emergency_contact = models.TextField(blank=True, null=True)
    average_grade = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class TeacherProfile(models.Model):
    user = models.OneToOneField('core.User', on_delete=models.CASCADE, related_name='teacher_profile', primary_key=True)
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    qualification = models.CharField(max_length=255, blank=True, null=True)
    specialization = models.CharField(max_length=255, blank=True, null=True)
    hire_date = models.DateField(blank=True, null=True)
    office_hours = models.CharField(max_length=255, blank=True, null=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class AdminProfile(models.Model):
    user = models.OneToOneField('core.User', on_delete=models.CASCADE, related_name='admin_profile', primary_key=True)
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    access_level = models.CharField(max_length=50, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Course(models.Model):
    LEVEL_CHOICES = (('Beginner', 'Beginner'), ('Intermediate', 'Intermediate'), ('Advanced', 'Advanced'))
    STATUS_CHOICES = (('draft', 'Draft'), ('active', 'Active'), ('archived', 'Archived'), ('inactive', 'Inactive'))
    ENROLLMENT_CHOICES = (('open', 'Open'), ('closed', 'Closed'), ('private', 'Private'), ('invite-only', 'Invite Only'))
    ACCESS_LEVELS = (('basic', 'Basic'), ('premium', 'Premium'), ('pro', 'Pro'))

    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, blank=True, null=True)
    language = models.CharField(max_length=50, default='English')
    duration_weeks = models.IntegerField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    thumbnail_url = models.TextField(blank=True, null=True)
    instructor = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, related_name='courses')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    enrollment_type = models.CharField(max_length=20, choices=ENROLLMENT_CHOICES, default='open')
    prerequisites = models.TextField(blank=True, null=True)
    learning_outcomes = models.JSONField(blank=True, null=True)
    tags = models.JSONField(blank=True, null=True)
    allow_discussions = models.BooleanField(default=True)
    require_approval = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    total_lectures = models.IntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_enrollments = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    access_level = models.CharField(max_length=20, choices=ACCESS_LEVELS, default='basic')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return self.title


class Lecture(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lectures')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    video_url = models.TextField(blank=True, null=True)
    video_file = models.CharField(max_length=255, blank=True, null=True)
    duration_minutes = models.IntegerField(blank=True, null=True)
    order_index = models.IntegerField()
    is_published = models.BooleanField(default=False)
    is_free_preview = models.BooleanField(default=False)
    content_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class LectureMaterial(models.Model):
    lecture = models.ForeignKey(Lecture, on_delete=models.CASCADE, related_name='materials')
    name = models.CharField(max_length=255)
    file_url = models.TextField()
    file_type = models.CharField(max_length=50, blank=True, null=True)
    file_size_kb = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class StudyMaterial(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='study_materials')
    title = models.CharField(max_length=255)
    file_url = models.TextField()
    file_type = models.CharField(max_length=50, blank=True, null=True)
    file_size_kb = models.IntegerField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    uploaded_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Enrollment(models.Model):
    STATUS_CHOICES = (('active', 'Active'), ('completed', 'Completed'), ('dropped', 'Dropped'), ('suspended', 'Suspended'))
    student = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrollment_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    last_accessed = models.DateTimeField(blank=True, null=True)
    completion_date = models.DateTimeField(blank=True, null=True)
    final_grade = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    certificate_issued = models.BooleanField(default=False)

    class Meta:
        unique_together = ('student', 'course')


class LectureProgress(models.Model):
    STATUS = (('not_started', 'Not started'), ('in_progress', 'In progress'), ('completed', 'Completed'))
    student = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='lecture_progress')
    lecture = models.ForeignKey(Lecture, on_delete=models.CASCADE, related_name='progress')
    status = models.CharField(max_length=20, choices=STATUS, default='not_started')
    watch_time_minutes = models.IntegerField(default=0)
    completed_at = models.DateTimeField(blank=True, null=True)
    last_position_seconds = models.IntegerField(default=0)

    class Meta:
        unique_together = ('student', 'lecture')


class Assignment(models.Model):
    STATUS = (('active', 'Active'), ('overdue', 'Overdue'))  # Status is stored in DB; 'overdue' is set when due_date passes
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField()
    total_marks = models.DecimalField(max_digits=10, decimal_places=2)
    word_limit = models.IntegerField(blank=True, null=True)
    allowed_file_types = models.JSONField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS, default='active')
    created_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class AssignmentSubmission(models.Model):
    STATUS = (('pending', 'Pending'), ('submitted', 'Submitted'), ('graded', 'Graded'), ('late', 'Late'), ('resubmitted', 'Resubmitted'))
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='assignment_submissions')
    submission_date = models.DateTimeField(auto_now_add=True)
    submitted_file_url = models.TextField(blank=True, null=True)
    submission_text = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS, default='submitted')
    marks_obtained = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    grade = models.CharField(max_length=5, blank=True, null=True)
    teacher_feedback = models.TextField(blank=True, null=True)
    graded_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='graded_submissions')
    graded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('assignment', 'student')


class AssignmentAttachment(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='attachments')
    file_name = models.CharField(max_length=255)
    file_url = models.TextField()
    file_size_kb = models.IntegerField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class Test(models.Model):
    STATUS = (('draft', 'Draft'), ('upcoming', 'Upcoming'), ('ongoing', 'Ongoing'), ('completed', 'Completed'), ('archived', 'Archived'))
    test_type_choices = (('test', 'Test'), ('quiz', 'Quiz'), ('midterm', 'Midterm'), ('final', 'Final'))
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='tests')
    title = models.CharField(max_length=255)
    subject = models.CharField(max_length=100, blank=True, null=True)
    test_type = models.CharField(max_length=20, choices=test_type_choices)
    scheduled_date = models.DateTimeField()
    duration_minutes = models.IntegerField()
    total_marks = models.DecimalField(max_digits=10, decimal_places=2)
    instructions = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS, default='upcoming')
    randomize_questions = models.BooleanField(default=False)
    show_results_immediately = models.BooleanField(default=False)
    created_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Question(models.Model):
    QUESTION_TYPES = (('mcq', 'MCQ'), ('descriptive', 'Descriptive'), ('true-false', 'True/False'), ('multiple-answer', 'Multiple answer'))
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    question_text = models.TextField()
    options = models.JSONField(blank=True, null=True)
    correct_answer = models.TextField(blank=True, null=True)
    marks = models.DecimalField(max_digits=5, decimal_places=2)
    order_index = models.IntegerField(blank=True, null=True)
    explanation = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class TestSubmission(models.Model):
    STATUS = (('in_progress', 'In progress'), ('submitted', 'Submitted'), ('graded', 'Graded'), ('abandoned', 'Abandoned'))
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='test_submissions')
    start_time = models.DateTimeField(auto_now_add=True)
    submit_time = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS, default='in_progress')
    marks_obtained = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    grade = models.CharField(max_length=5, blank=True, null=True)
    teacher_feedback = models.TextField(blank=True, null=True)
    time_taken_minutes = models.IntegerField(blank=True, null=True)

    class Meta:
        unique_together = ('test', 'student')


class TestAnswer(models.Model):
    submission = models.ForeignKey(TestSubmission, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    student_answer = models.TextField(blank=True, null=True)
    is_correct = models.BooleanField(blank=True, null=True)
    marks_awarded = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    marked = models.BooleanField(default=False)
    marker_notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('submission', 'question')


class AttendanceRecord(models.Model):
    STATUS = (('present', 'Present'), ('absent', 'Absent'), ('late', 'Late'), ('excused', 'Excused'))
    student = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='attendance_records')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS)
    notes = models.TextField(blank=True, null=True)
    marked_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='marked_attendance')
    marked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course', 'date')


class LibraryItem(models.Model):
    ITEM_TYPES = (('Book', 'Book'), ('Video', 'Video'), ('Document', 'Document'), ('Audio', 'Audio'), ('Article', 'Article'), ('Research Paper', 'Research Paper'))
    title = models.CharField(max_length=255)
    item_type = models.CharField(max_length=50, choices=ITEM_TYPES)
    category = models.CharField(max_length=100, blank=True, null=True)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)
    subject = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    file_url = models.TextField(blank=True, null=True)
    thumbnail_url = models.TextField(blank=True, null=True)
    file_size_kb = models.IntegerField(blank=True, null=True)
    duration_minutes = models.IntegerField(blank=True, null=True)
    pages = models.IntegerField(blank=True, null=True)
    uploaded_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    total_downloads = models.IntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    tags = models.JSONField(blank=True, null=True)
    is_featured = models.BooleanField(default=False)
    access_level = models.CharField(max_length=20, default='all')
    created_at = models.DateTimeField(auto_now_add=True)


class LibraryFavorite(models.Model):
    user = models.ForeignKey('core.User', on_delete=models.CASCADE)
    library_item = models.ForeignKey(LibraryItem, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'library_item')


class LibraryDownload(models.Model):
    user = models.ForeignKey('core.User', on_delete=models.CASCADE)
    library_item = models.ForeignKey(LibraryItem, on_delete=models.CASCADE)
    download_date = models.DateTimeField(auto_now_add=True)


class Event(models.Model):
    EVENT_TYPES = (('live-class', 'Live class'), ('quiz', 'Quiz'), ('test', 'Test'), ('assignment', 'Assignment'), ('meeting', 'Meeting'), ('workshop', 'Workshop'), ('webinar', 'Webinar'), ('deadline', 'Deadline'))
    title = models.CharField(max_length=255)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    event_date = models.DateField()
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)
    instructor = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    zoom_link = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class LiveClass(models.Model):
    STATUS = (('scheduled', 'Scheduled'), ('live', 'Live'), ('completed', 'Completed'))
    title = models.CharField(max_length=255)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='live_classes')
    instructor = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='live_classes')
    description = models.TextField(blank=True, null=True)
    scheduled_time = models.DateTimeField(blank=True, null=True)
    duration_minutes = models.IntegerField(blank=True, null=True)
    duration_minutes = models.IntegerField(blank=True, null=True)
    zoom_link = models.TextField(blank=True, null=True)
    zoom_password = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.status}"


class Announcement(models.Model):
    PRIORITY_CHOICES = (('normal', 'Normal'), ('important', 'Important'), ('urgent', 'Urgent'))

    title = models.CharField(max_length=255)
    body = models.TextField()
    audience = models.CharField(max_length=50, blank=True, null=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    # channels: store which notification channels were used (e.g. ['in-app','email','sms'])
    channels = models.JSONField(blank=True, null=True)
    # scheduled_for: optional datetime to send later
    scheduled_for = models.DateTimeField(blank=True, null=True)
    # expires_at: optional expiration
    expires_at = models.DateTimeField(blank=True, null=True)
    is_pinned = models.BooleanField(default=False)
    require_ack = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    views = models.IntegerField(default=0)
    acknowledged = models.IntegerField(default=0)
    created_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Upload(models.Model):
    file_name = models.CharField(max_length=255)
    file_url = models.TextField()
    uploaded_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class UserSettings(models.Model):
    """User settings for profile, appearance, notifications, privacy, and role-specific preferences"""
    user = models.OneToOneField('core.User', on_delete=models.CASCADE, related_name='settings', primary_key=True)
    
    # Appearance settings
    theme = models.CharField(max_length=20, default='light', choices=[('light', 'Light'), ('dark', 'Dark')])
    language = models.CharField(max_length=10, default='en', choices=[('en', 'English'), ('hi', 'Hindi')])
    timezone = models.CharField(max_length=50, default='UTC-5')
    dashboard_view = models.CharField(max_length=50, default='default', choices=[('default', 'Default'), ('courses', 'Courses'), ('calendar', 'Calendar'), ('analytics', 'Analytics')])
    
    # Notification settings
    email_notifications = models.BooleanField(default=True)
    inapp_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    notify_assignments = models.BooleanField(default=True)
    notify_grades = models.BooleanField(default=True)
    notify_announcements = models.BooleanField(default=True)
    notify_reminders = models.BooleanField(default=True)
    notify_discussion_replies = models.BooleanField(default=False)
    notify_student_submissions = models.BooleanField(default=False)
    
    # Privacy settings
    profile_visibility = models.CharField(max_length=20, default='public', choices=[('public', 'Public'), ('students', 'Students Only'), ('teachers', 'Teachers Only'), ('private', 'Private')])
    email_visible = models.BooleanField(default=False)
    phone_visible = models.BooleanField(default=False)
    allow_messaging = models.BooleanField(default=True)
    two_factor_auth = models.BooleanField(default=False)
    
    # Student course preferences
    auto_enrollment = models.BooleanField(default=False)
    deadline_reminders = models.BooleanField(default=True)
    late_submission_warning = models.BooleanField(default=True)
    
    # Teacher preferences
    default_grading_scheme = models.CharField(max_length=20, default='percentage', choices=[('percentage', 'Percentage'), ('letter', 'Letter Grade'), ('points', 'Points')])
    late_submission_policy = models.CharField(max_length=20, default='partial_credit', choices=[('no_penalty', 'No Penalty'), ('partial_credit', 'Partial Credit'), ('no_credit', 'No Credit')])
    course_visibility = models.CharField(max_length=20, default='public', choices=[('public', 'Public'), ('unlisted', 'Unlisted'), ('private', 'Private')])
    plagiarism_check = models.BooleanField(default=True)
    student_messaging = models.BooleanField(default=True)
    
    # Admin settings
    user_registration = models.BooleanField(default=True)
    course_approval = models.BooleanField(default=False)
    system_maintenance = models.BooleanField(default=False)
    backup_frequency = models.CharField(max_length=20, default='daily', choices=[('hourly', 'Hourly'), ('daily', 'Daily'), ('weekly', 'Weekly')])
    password_policy = models.CharField(max_length=20, default='strong', choices=[('weak', 'Weak'), ('medium', 'Medium'), ('strong', 'Strong')])
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.user.username}"


class ActivityLog(models.Model):
    """Track platform activity for admin dashboard."""
    ACTIVITY_TYPES = (
        ('user_registered', 'User Registered'),
        ('course_published', 'Course Published'),
        ('assignment_submitted', 'Assignment Submitted'),
        ('test_completed', 'Test Completed'),
        ('system_maintenance', 'System Maintenance'),
        ('user_enrolled', 'User Enrolled'),
        ('announcement_posted', 'Announcement Posted'),
        ('system_alert', 'System Alert'),
    )
    
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    user = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.activity_type})"


class SystemAlert(models.Model):
    """Track system health alerts for backend, database, server, payment services."""
    ALERT_TYPES = (
        ('backend', 'Backend Service'),
        ('database', 'Database'),
        ('server', 'Server'),
        ('payment', 'Payment System'),
        ('storage', 'Storage Service'),
        ('api', 'API Service'),
        ('email', 'Email Service'),
    )
    
    SEVERITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('resolved', 'Resolved'),
        ('investigating', 'Investigating'),
        ('monitoring', 'Monitoring'),
    )
    
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    title = models.CharField(max_length=255)
    description = models.TextField()
    affected_service = models.CharField(max_length=255, blank=True, null=True)
    resolution_steps = models.TextField(blank=True, null=True)
    affected_users_count = models.IntegerField(default=0, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.alert_type} - {self.severity})"


class Notification(models.Model):
    """User notifications for announcements, messages, and platform updates."""
    NOTIFICATION_TYPES = (
        ('announcement', 'Announcement'),
        ('message', 'Message'),
        ('update', 'Update'),
        ('reminder', 'Reminder'),
        ('alert', 'Alert'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, default='announcement')
    title = models.CharField(max_length=255)
    message = models.TextField()
    related_object_type = models.CharField(max_length=50, blank=True, null=True)  # e.g., 'course', 'announcement'
    related_object_id = models.IntegerField(blank=True, null=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.user.username}"


class CourseRating(models.Model):
    """Student ratings for courses."""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='ratings')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='course_ratings')
    rating = models.DecimalField(max_digits=2, decimal_places=1)  # 0.0 to 5.0
    review = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('course', 'student')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student.username} rated {self.course.title}: {self.rating}"
