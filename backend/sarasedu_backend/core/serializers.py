from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Course, Lecture, LectureMaterial, StudyMaterial,
    LiveClass,
    Enrollment, LectureProgress, Assignment, AssignmentSubmission, AssignmentAttachment,
    Test, Question, TestSubmission, TestAnswer, AttendanceRecord,
    LibraryItem, LibraryFavorite, LibraryDownload, Event, Announcement, Upload,
    StudentProfile, TeacherProfile, AdminProfile, UserSettings, ActivityLog, SystemAlert, Notification, CourseRating
)
from django.contrib.auth.password_validation import validate_password
from django.db.models import Avg

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'role')

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'avatar_url', 'bio', 'phone', 'date_joined', 'last_login')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = StudentProfile
        fields = '__all__'


class TeacherProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = TeacherProfile
        fields = '__all__'


class AdminProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminProfile
        fields = '__all__'


class CourseSerializer(serializers.ModelSerializer):
    instructor = UserSerializer(read_only=True)

    class Meta:
        model = Course
        fields = '__all__'


class LectureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lecture
        fields = '__all__'


class LectureMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = LectureMaterial
        fields = '__all__'


class StudyMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyMaterial
        fields = '__all__'


class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = '__all__'


class LectureProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LectureProgress
        fields = '__all__'


class AssignmentSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Assignment
        fields = '__all__'


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    class Meta:
        model = AssignmentSubmission
        fields = '__all__'


class AssignmentAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentAttachment
        fields = '__all__'


class TestSerializer(serializers.ModelSerializer):
    average_marks = serializers.SerializerMethodField(read_only=True)
    average_percentage = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Test
        fields = '__all__'

    def get_average_marks(self, obj):
        try:
            agg = TestSubmission.objects.filter(test=obj).aggregate(avg=Avg('marks_obtained'))
            return agg.get('avg') or 0.0
        except Exception:
            return 0.0

    def get_average_percentage(self, obj):
        try:
            # If total_marks is available, compute average percentage across submissions
            total = obj.total_marks
            if not total or float(total) == 0:
                # fallback to average raw marks when total not set
                return self.get_average_marks(obj)
            # compute each submission's percentage then average
            subs = TestSubmission.objects.filter(test=obj).exclude(marks_obtained__isnull=True)
            if not subs.exists():
                return 0.0
            # sum percentages and divide
            total_pct = 0.0
            count = 0
            for s in subs:
                try:
                    pct = (float(s.marks_obtained) / float(total)) * 100
                except Exception:
                    pct = 0.0
                total_pct += pct
                count += 1
            return round(total_pct / count, 2) if count else 0.0
        except Exception:
            return 0.0


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'


class TestSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestSubmission
        fields = '__all__'


class TestAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestAnswer
        fields = '__all__'


class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = '__all__'


class LibraryItemSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    # Accept `course_id` on write and include `course_id` on read so clients
    # (frontend) can send and receive the course id consistently.
    course_id = serializers.IntegerField(required=False, allow_null=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False, allow_null=True)

    class Meta:
        model = LibraryItem
        fields = '__all__'

    def _normalize_tags(self, value):
        # Accept list or comma-separated string
        if value is None:
            return None
        if isinstance(value, list):
            return [str(v).strip() for v in value if v is not None and str(v).strip()]
        if isinstance(value, str):
            return [t.strip() for t in value.split(',') if t.strip()]
        # fallback to stringified single value
        return [str(value)]

    def create(self, validated_data):
        # Map course_id to course FK if provided
        course_id = validated_data.pop('course_id', None)
        tags = validated_data.pop('tags', None)
        if tags is not None:
            validated_data['tags'] = self._normalize_tags(tags)
        if course_id is not None:
            from .models import Course
            try:
                validated_data['course'] = Course.objects.get(id=course_id)
            except Exception:
                # ignore if invalid course id; leave as null and let validation downstream handle it
                validated_data['course'] = None

        return super().create(validated_data)

    def update(self, instance, validated_data):
        course_id = validated_data.pop('course_id', None)
        tags = validated_data.pop('tags', None)
        if tags is not None:
            validated_data['tags'] = self._normalize_tags(tags)
        if course_id is not None:
            from .models import Course
            try:
                validated_data['course'] = Course.objects.get(id=course_id)
            except Exception:
                validated_data['course'] = None

        return super().update(instance, validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        try:
            ret['course_id'] = instance.course.id if getattr(instance, 'course', None) else None
        except Exception:
            ret['course_id'] = None
        # ensure tags is always a list for frontend convenience
        if ret.get('tags') is None:
            ret['tags'] = []
        return ret


class LibraryFavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryFavorite
        fields = '__all__'


class LibraryDownloadSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryDownload
        fields = '__all__'


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'


class LiveClassSerializer(serializers.ModelSerializer):
    instructor = UserSerializer(read_only=True)

    class Meta:
        model = LiveClass
        fields = '__all__'


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = '__all__'


class UploadSerializer(serializers.ModelSerializer):
    # Provide a `url` alias for compatibility with clients that expect `url`
    # while the model stores `file_url`.
    url = serializers.CharField(source='file_url', read_only=True)
    class Meta:
        model = Upload
        fields = '__all__'


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    course_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ActivityLog
        fields = ('id', 'activity_type', 'title', 'description', 'user', 'user_name', 'course', 'course_name', 'metadata', 'created_at')
        read_only_fields = ('created_at',)
    
    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return None
    
    def get_course_name(self, obj):
        if obj.course:
            return obj.course.title or obj.course.name
        return None


class SystemAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemAlert
        fields = ('id', 'alert_type', 'severity', 'status', 'title', 'description', 'affected_service', 'resolution_steps', 'affected_users_count', 'metadata', 'created_at', 'resolved_at')
        read_only_fields = ('created_at',)


class NotificationSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ('id', 'user', 'user_name', 'notification_type', 'title', 'message', 'related_object_type', 'related_object_id', 'read', 'created_at', 'read_at')
        read_only_fields = ('created_at', 'read_at')
    
    def get_user_name(self, obj):
        return obj.user.username if obj.user else None


class CourseRatingSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CourseRating
        fields = ('id', 'course', 'student', 'student_name', 'rating', 'review', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')
    
    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name}".strip() or obj.student.username
        return None
    
    def validate_rating(self, value):
        if value < 0 or value > 5:
            raise serializers.ValidationError("Rating must be between 0 and 5")
        return value
