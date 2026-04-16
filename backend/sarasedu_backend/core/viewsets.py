from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.db import IntegrityError, DatabaseError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
import requests
from django.utils import timezone
import os
import uuid
import logging
from django.utils.text import get_valid_filename
from .models import (
    Course, Lecture, LectureMaterial, StudyMaterial,
    LiveClass,
    Enrollment, LectureProgress, Assignment, AssignmentSubmission, AssignmentAttachment,
    Test, Question, TestSubmission, TestAnswer, AttendanceRecord,
    LibraryItem, LibraryFavorite, LibraryDownload, Event, Announcement, Upload,
    StudentProfile, TeacherProfile, AdminProfile, UserSettings, ActivityLog, SystemAlert, Notification, CourseRating
)

User = get_user_model()
logger = logging.getLogger(__name__)
from .serializers import (
    CourseSerializer, LectureSerializer, LectureMaterialSerializer, StudyMaterialSerializer,
    LiveClassSerializer,
    EnrollmentSerializer, LectureProgressSerializer, AssignmentSerializer, AssignmentSubmissionSerializer, AssignmentAttachmentSerializer,
    TestSerializer, QuestionSerializer, TestSubmissionSerializer, TestAnswerSerializer, AttendanceRecordSerializer,
    LibraryItemSerializer, LibraryFavoriteSerializer, LibraryDownloadSerializer, EventSerializer, AnnouncementSerializer, UploadSerializer,
    StudentProfileSerializer, TeacherProfileSerializer, AdminProfileSerializer, UserSettingsSerializer,
    ActivityLogSerializer, SystemAlertSerializer, NotificationSerializer, CourseRatingSerializer
)


class BaseModelViewSet(viewsets.ModelViewSet):
    # Default: read-only for anonymous, authenticated users can read.
    # For write operations, viewsets can set `write_permission_classes` to control who may create/update/delete.
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    write_permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [p() for p in self.permission_classes]
        return [p() for p in getattr(self, 'write_permission_classes', self.permission_classes)]

    def get_queryset(self):
        """
        Return a queryset filtered by the requesting user's role.

        - Admin: sees everything.
        - Teacher: sees only objects they created / uploaded / own (fields: instructor, created_by, uploaded_by)
        - Student: sees only objects directly related to them (student field, or user-specific models).

        This attempts to infer the owner field from the model fields and apply sensible defaults.
        """
        qs = getattr(self, 'queryset', None)
        if qs is None:
            return super().get_queryset()
        user = getattr(self.request, 'user', None)
        # unauthenticated: return public queryset (as defined)
        if not user or not user.is_authenticated:
            return qs
        # admins see all
        if getattr(user, 'role', None) == 'admin':
            return qs

        model = getattr(qs, 'model', None)
        if model is None:
            return qs

        field_names = {f.name for f in model._meta.get_fields()}

        # If a course query param is provided and the model has a course FK, filter by it.
        try:
            course_param = self.request.query_params.get('course')
        except Exception:
            course_param = None
        if course_param and 'course' in field_names:
            try:
                return qs.filter(course_id=course_param)
            except Exception:
                # fall back to unfiltered
                pass

        # Helpers for common models (explicit rules)
        model_name = model.__name__.lower()

        # Enrollment: teachers should see enrollments for their courses
        if model_name == 'enrollment' and getattr(user, 'role', None) == 'teacher':
            return qs.filter(course__instructor=user)
        if model_name == 'enrollment' and getattr(user, 'role', None) == 'student':
            return qs.filter(student=user)

        # LectureProgress: teachers see progress for lectures in their courses; students see own progress
        if model_name == 'lectureprogress':
            if getattr(user, 'role', None) == 'teacher':
                return qs.filter(lecture__course__instructor=user)
            if getattr(user, 'role', None) == 'student':
                return qs.filter(student=user)

        # Lectures: if teacher, limit to their courses; students may view lectures by course param
        if model_name == 'lecture':
            if getattr(user, 'role', None) == 'teacher':
                return qs.filter(course__instructor=user)
            # students fall through to course param filter handled above or default qs

        # AssignmentSubmission / TestSubmission: students see own, teachers see submissions for assignments/tests they created
        if model_name in ('assignmentsubmission', 'testsubmission'):
            if getattr(user, 'role', None) == 'student':
                return qs.filter(student=user)
            if getattr(user, 'role', None) == 'teacher':
                # submissions relate to assignment/test -> course -> instructor
                if 'assignment' in field_names:
                    return qs.filter(assignment__course__instructor=user)
                if 'test' in field_names:
                    return qs.filter(test__course__instructor=user)

        # Library items: uploaded_by
        if 'uploaded_by' in field_names and getattr(user, 'role', None) == 'teacher':
            return qs.filter(uploaded_by=user)
        if 'uploaded_by' in field_names and getattr(user, 'role', None) == 'student':
            # students can see library items; keep default (all) or filter by access level if needed
            return qs

        # Events: teachers should see events they created / where they are instructor
        if model_name == 'event' and getattr(user, 'role', None) == 'teacher':
            if 'instructor' in field_names:
                return qs.filter(instructor=user)
            if 'created_by' in field_names:
                return qs.filter(created_by=user)

        # Courses: teachers should see only their courses
        if model_name == 'course' and getattr(user, 'role', None) == 'teacher':
            if 'instructor' in field_names:
                return qs.filter(instructor=user)

        # Tests / Assignments / StudyMaterial / Announcements: filter by created_by or course instructor
        if getattr(user, 'role', None) == 'teacher':
            if 'created_by' in field_names:
                # include items the teacher created
                try:
                    return qs.filter(created_by=user)
                except Exception:
                    pass
            if 'instructor' in field_names:
                try:
                    return qs.filter(instructor=user)
                except Exception:
                    pass
            # study materials often use uploaded_by
            if 'uploaded_by' in field_names:
                try:
                    return qs.filter(uploaded_by=user)
                except Exception:
                    pass

        # Students: common rule - if model has 'student' FK, show only their rows
        if getattr(user, 'role', None) == 'student' and 'student' in field_names:
            return qs.filter(student=user)

        # If model has a generic 'user' FK (profiles, favorites), scope to the requesting user
        if 'user' in field_names:
            return qs.filter(user=user)

        # Fall back to default queryset (e.g., public list) for roles not matching above
        return qs

    def perform_create(self, serializer):
        """Set common ownership fields on create when present on the model.

        This automatically assigns `created_by`, `uploaded_by` or `instructor`
        to the requesting user where appropriate to keep ownership consistent.
        """
        user = getattr(self.request, 'user', None)
        if not user or not user.is_authenticated:
            return serializer.save()

        model = None
        try:
            model = getattr(serializer.Meta, 'model', None)
        except Exception:
            model = None

        if model is None:
            return serializer.save()

        field_names = {f.name for f in model._meta.get_fields()}
        kwargs = {}
        if 'created_by' in field_names:
            kwargs['created_by'] = user
        if 'uploaded_by' in field_names:
            kwargs['uploaded_by'] = user
        # For courses, set instructor if teacher
        if 'instructor' in field_names and getattr(user, 'role', None) == 'teacher':
            kwargs['instructor'] = user

        if kwargs:
            return serializer.save(**kwargs)
        return serializer.save()


class CourseViewSet(BaseModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('title', 'subtitle', 'description', 'tags')
    ordering_fields = ('created_at', 'title')
    ordering = ('-created_at',)
    # Only teachers and admins may create/update/delete
    from .permissions import IsTeacherOrAdmin
    write_permission_classes = [IsTeacherOrAdmin]
    # object-level permission: only instructor or admin may edit/delete
    from .permissions import IsInstructorOrAdmin

    def get_permissions(self):
        # For safe methods use the BaseModelViewSet behavior
        if self.request.method in permissions.SAFE_METHODS:
            return [p() for p in self.permission_classes]
        # Create: require teacher or admin
        if self.request.method == 'POST':
            return [p() for p in getattr(self, 'write_permission_classes', self.permission_classes)]
        # For PUT/PATCH/DELETE enforce object-level InstructorOrAdmin
        return [IsInstructorOrAdmin()]

    def perform_create(self, serializer):
        # set the instructor to the requesting user if they are a teacher
        user = self.request.user
        if user and user.is_authenticated and getattr(user, 'role', None) in ('teacher', 'admin'):
            serializer.save(instructor=user)
        else:
            serializer.save()
    def get_queryset(self):
        qs = super().get_queryset()
        rp = getattr(self.request, 'query_params', {})
        course = rp.get('course') or rp.get('course_id')
        created_by = rp.get('created_by') or rp.get('created_by_id')
        if course:
            try:
                qs = qs.filter(course_id=course)
            except Exception:
                pass
        if created_by:
            try:
                qs = qs.filter(created_by_id=created_by)
            except Exception:
                pass
        return qs
    def perform_update(self, serializer):
        # Prevent non-admins from changing the instructor field
        user = self.request.user
        if user and user.is_authenticated and getattr(user, 'role', None) != 'admin':
            # ensure instructor remains unchanged
            serializer.save()
        else:
            serializer.save()


class LectureViewSet(BaseModelViewSet):
    queryset = Lecture.objects.all()
    serializer_class = LectureSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('title', 'description')
    ordering_fields = ('order_index', 'created_at')


class LectureMaterialViewSet(BaseModelViewSet):
    queryset = LectureMaterial.objects.all()
    serializer_class = LectureMaterialSerializer


class StudyMaterialViewSet(BaseModelViewSet):
    queryset = StudyMaterial.objects.all()
    serializer_class = StudyMaterialSerializer


class EnrollmentViewSet(BaseModelViewSet):
    queryset = Enrollment.objects.all().order_by('id')
    serializer_class = EnrollmentSerializer


class LectureProgressViewSet(BaseModelViewSet):
    queryset = LectureProgress.objects.all()
    serializer_class = LectureProgressSerializer


class AssignmentViewSet(BaseModelViewSet):
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer
    from .permissions import IsTeacherOrAdmin
    write_permission_classes = [IsTeacherOrAdmin]

    def perform_create(self, serializer):
        # set created_by to the requesting user when teachers/admins create assignments
        user = self.request.user
        if user and user.is_authenticated:
            serializer.save(created_by=user)
        else:
            serializer.save()

    def get_queryset(self):
        """
        Auto-update DB statuses so overdue assignments flip from 'active' to 'overdue'
        before we return any assignment results. This keeps the database in sync
        without requiring a separate scheduler. The update is idempotent and cheap.
        """
        try:
            # Update any active assignments whose due_date has already passed
            Assignment.objects.filter(status='active', due_date__lt=timezone.now()).update(status='overdue')
        except Exception:
            # Never fail the request if the maintenance update encounters an issue
            pass

        qs = super().get_queryset()
        # Optional filters for convenience
        rp = getattr(self.request, 'query_params', {})
        course = rp.get('course') or rp.get('course_id')
        created_by = rp.get('created_by') or rp.get('created_by_id')
        if course:
            try:
                qs = qs.filter(course_id=course)
            except Exception:
                pass
        if created_by:
            try:
                qs = qs.filter(created_by_id=created_by)
            except Exception:
                pass
        return qs


class AssignmentSubmissionViewSet(BaseModelViewSet):
    queryset = AssignmentSubmission.objects.all()
    serializer_class = AssignmentSubmissionSerializer
    # Students may create submissions; editing/grading restricted by other rules
    from rest_framework import permissions as _permissions
    write_permission_classes = [_permissions.IsAuthenticated]

    def get_queryset(self):
        # Start from the base queryset with role-based scoping applied by BaseModelViewSet
        qs = super().get_queryset()
        # Allow filtering by assignment id via query param `?assignment=<id>`
        assignment_param = None
        try:
            assignment_param = self.request.query_params.get('assignment')
        except Exception:
            assignment_param = None
        if assignment_param:
            try:
                qs = qs.filter(assignment_id=assignment_param)
            except Exception:
                pass
        return qs

    def create(self, request, *args, **kwargs):
        assignment_id = request.data.get('assignment')
        if not assignment_id:
            return Response({'detail': 'assignment field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            assignment = Assignment.objects.get(id=assignment_id)
        except Assignment.DoesNotExist:
            return Response({'detail': 'assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not user or not user.is_authenticated or getattr(user, 'role', None) != 'student':
            return Response({'detail': 'Only students may create submissions.'}, status=status.HTTP_403_FORBIDDEN)
        # Wrap the submission flow to catch unexpected errors and provide
        # clearer responses during development/debugging.
        try:
            file = request.FILES.get('file')
            submitted_file_url = None
            if file:
                max_mb = getattr(settings, 'MAX_UPLOAD_MB', 20)
                try:
                    if getattr(file, 'size', None) and file.size > (max_mb * 1024 * 1024):
                        return Response({'detail': 'File exceeds maximum size', 'max_upload_mb': max_mb}, status=status.HTTP_400_BAD_REQUEST)
                except Exception:
                    # ignore size check if file doesn't expose size
                    pass

                allowed_mimes = getattr(settings, 'ALLOWED_UPLOAD_MIME_TYPES', []) or []
                try:
                    content_type = getattr(file, 'content_type', None)
                    if content_type and allowed_mimes and content_type not in allowed_mimes:
                        return Response({'detail': 'Disallowed file type', 'content_type': content_type}, status=status.HTTP_400_BAD_REQUEST)
                except Exception:
                    pass

                try:
                    original = os.path.basename(getattr(file, 'name', 'upload'))
                    safe_name = get_valid_filename(original) or 'upload'
                    rel_path = f'assignment_submissions/{uuid.uuid4().hex}_{safe_name}'
                    path = default_storage.save(rel_path, file)
                    submitted_file_url = default_storage.url(path)
                except Exception:
                    logger.exception('Assignment submission file save failed for assignment_id=%s user_id=%s', assignment.id, user.pk)
                    return Response({'detail': 'Failed to save uploaded file to storage.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                submitted_file_url = request.data.get('submitted_file_url') or None

            submission_text = request.data.get('submission_text', '')

            existing = AssignmentSubmission.objects.filter(assignment=assignment, student=user).first()
            if existing:
                if submitted_file_url:
                    existing.submitted_file_url = submitted_file_url
                if submission_text:
                    existing.submission_text = submission_text
                existing.status = 'submitted'
                existing.save()
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

            submission = AssignmentSubmission.objects.create(
                assignment=assignment,
                student=user,
                submitted_file_url=submitted_file_url,
                submission_text=submission_text,
                status='submitted'
            )
            serializer = self.get_serializer(submission)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except IntegrityError:
            logger.exception('Assignment submission integrity error for assignment_id=%s user_id=%s', assignment.id, user.pk)
            return Response({'detail': 'Database integrity error saving submission.'}, status=status.HTTP_409_CONFLICT)
        except Exception:
            logger.exception('Assignment submission create failed for assignment_id=%s user_id=%s', assignment.id, user.pk)
            return Response({'detail': 'Unexpected server error saving submission.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        # restrict grading fields to teachers/admins
        user = request.user
        if user and user.is_authenticated and getattr(user, 'role', None) in ('teacher', 'admin'):
            return super().update(request, *args, **kwargs)
        # students may only update their submission_text before grading
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        if instance.student != user:
            return Response({'detail': 'Cannot modify others submissions.'}, status=status.HTTP_403_FORBIDDEN)
        allowed = ['submission_text']
        data = {k: v for k, v in request.data.items() if k in allowed}
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


    def get_queryset(self):
        qs = super().get_queryset()
        rp = getattr(self.request, 'query_params', {})
        submission = rp.get('submission') or rp.get('submission_id')
        question = rp.get('question') or rp.get('question_id')
        user = getattr(self.request, 'user', None)

        if submission:
            try:
                qs = qs.filter(submission_id=submission)
            except Exception:
                pass
        if question:
            try:
                qs = qs.filter(question_id=question)
            except Exception:
                pass

        # If requester is a student, restrict to answers belonging to their submissions
        if getattr(user, 'is_authenticated', False) and getattr(user, 'role', None) == 'student':
            try:
                qs = qs.filter(submission__student=user)
            except Exception:
                pass

        return qs

    def get_queryset(self):
        qs = super().get_queryset()
        rp = getattr(self.request, 'query_params', {})
        test_id = rp.get('test') or rp.get('test_id')
        student = rp.get('student') or rp.get('student_id')
        user = getattr(self.request, 'user', None)

        if test_id:
            try:
                qs = qs.filter(test_id=test_id)
            except Exception:
                pass

        # If the requester is a student, restrict to their own submissions
        if getattr(user, 'is_authenticated', False) and getattr(user, 'role', None) == 'student':
            try:
                qs = qs.filter(student=user)
            except Exception:
                pass
        elif student:
            try:
                qs = qs.filter(student_id=student)
            except Exception:
                pass

        return qs


class AssignmentAttachmentViewSet(BaseModelViewSet):
    queryset = AssignmentAttachment.objects.all()
    serializer_class = AssignmentAttachmentSerializer


class TestViewSet(BaseModelViewSet):
    queryset = Test.objects.all()
    serializer_class = TestSerializer
    from .permissions import IsTeacherOrAdmin
    write_permission_classes = [IsTeacherOrAdmin]

    def perform_create(self, serializer):
        # set created_by to requesting user when teacher/admin creates a test
        user = self.request.user
        if user and user.is_authenticated and getattr(user, 'role', None) in ('teacher', 'admin'):
            serializer.save(created_by=user)
        else:
            serializer.save()

class QuestionViewSet(BaseModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer

    from .permissions import IsTeacherOrAdmin
    write_permission_classes = [IsTeacherOrAdmin]

    def perform_create(self, serializer):
        # Only teachers/admins may create questions. Ensure the question's test
        # is one the teacher owns/teaches or was created by them.
        user = self.request.user
        if not user or not user.is_authenticated:
            return serializer.save()

        test_obj = None
        try:
            # serializer may include 'test' as id or nested; try to get from initial data
            test_id = self.request.data.get('test') or self.request.data.get('test_id')
            if test_id:
                test_obj = Test.objects.get(id=test_id)
        except Exception:
            test_obj = None

        # If a test object is present, ensure the teacher has rights to add questions
        if test_obj and getattr(user, 'role', None) == 'teacher':
            # allow if teacher is course instructor or test.creator
            course_instructor = getattr(test_obj.course, 'instructor', None)
            if course_instructor != user and getattr(test_obj, 'created_by', None) != user:
                # Disallow silently by raising permission error through serializer.save
                raise PermissionError('Teacher does not have permission to add questions for this test')

        # Save normally (BaseModelViewSet will set created_by/uploaded_by where applicable)
        serializer.save()

    def get_queryset(self):
        qs = super().get_queryset()
        rp = getattr(self.request, 'query_params', {})
        test_id = rp.get('test') or rp.get('test_id')
        if test_id:
            try:
                qs = qs.filter(test_id=test_id)
            except Exception:
                pass
        return qs


class TestSubmissionViewSet(BaseModelViewSet):
    queryset = TestSubmission.objects.all()
    serializer_class = TestSubmissionSerializer
    
    def create(self, request, *args, **kwargs):
        # Expected payload: { test: <id>, answers: [{ question: id, student_answer: '...' }, ...] }
        test_id = request.data.get('test') or request.data.get('test_id')
        if not test_id:
            return Response({'detail': 'test field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            test = Test.objects.get(id=test_id)
        except Test.DoesNotExist:
            return Response({'detail': 'test not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not user or not user.is_authenticated or getattr(user, 'role', None) != 'student':
            return Response({'detail': 'Only students may create test submissions.'}, status=status.HTTP_403_FORBIDDEN)

        # If a submission already exists for this student+test, update its status/time
        existing = TestSubmission.objects.filter(test=test, student=user).first()
        submit_time = timezone.now()
        try:
            # Handle optional answers in payload
            answers_payload = request.data.get('answers') or []

            if existing:
                existing.status = 'submitted'
                existing.submit_time = submit_time
                existing.save()
                # Optionally accept new answers and overwrite existing answers
                if answers_payload:
                    for a in answers_payload:
                        qid = a.get('question') or a.get('question_id')
                        ans_text = a.get('student_answer') or a.get('answer') or ''
                        try:
                            q = Question.objects.get(id=qid)
                        except Question.DoesNotExist:
                            continue
                        ta, created = TestAnswer.objects.update_or_create(
                            submission=existing, question=q,
                            defaults={'student_answer': ans_text}
                        )
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

            # Create a new submission record
            submission = TestSubmission.objects.create(
                test=test,
                student=user,
                submit_time=submit_time,
                status='submitted'
            )

            # Auto-grade if answers provided
            total_awarded = 0
            for a in answers_payload:
                qid = a.get('question') or a.get('question_id')
                ans_text = a.get('student_answer') or a.get('answer') or ''
                try:
                    q = Question.objects.get(id=qid)
                except Question.DoesNotExist:
                    continue
                is_correct = False
                marks_awarded = None
                try:
                    correct = (q.correct_answer or '').strip().lower()
                    if correct and ans_text and correct == str(ans_text).strip().lower():
                        is_correct = True
                        marks_awarded = float(q.marks or 0)
                        total_awarded += marks_awarded
                    else:
                        marks_awarded = 0
                except Exception:
                    marks_awarded = 0

                TestAnswer.objects.create(
                    submission=submission,
                    question=q,
                    student_answer=ans_text,
                    is_correct=is_correct,
                    marks_awarded=marks_awarded
                )

            # Update submission marks and grade if test.total_marks available
            try:
                submission.marks_obtained = total_awarded
                percentage = 0
                if test.total_marks and float(test.total_marks) > 0:
                    percentage = round((total_awarded / float(test.total_marks)) * 100)
                # Simple grade mapping
                if percentage >= 90:
                    grade = 'A+'
                elif percentage >= 85:
                    grade = 'A'
                elif percentage >= 80:
                    grade = 'A-'
                elif percentage >= 75:
                    grade = 'B+'
                elif percentage >= 70:
                    grade = 'B'
                elif percentage >= 65:
                    grade = 'B-'
                elif percentage >= 60:
                    grade = 'C+'
                elif percentage >= 55:
                    grade = 'C'
                elif percentage >= 50:
                    grade = 'C-'
                else:
                    grade = 'F'
                submission.grade = grade
                submission.save()
            except Exception:
                # ignore grading errors but keep submission
                submission.save()

            serializer = self.get_serializer(submission)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except IntegrityError:
            logger.exception('Integrity error saving test submission for test_id=%s user_id=%s', test.id, user.pk)
            return Response({'detail': 'Database integrity error saving test submission.'}, status=status.HTTP_409_CONFLICT)
        except Exception:
            logger.exception('Unexpected error saving test submission for test_id=%s user_id=%s', test.id, user.pk)
            return Response({'detail': 'Unexpected server error saving test submission.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        # Teachers/admins may update grading fields
        user = request.user
        if user and user.is_authenticated and getattr(user, 'role', None) in ('teacher', 'admin'):
            return super().update(request, *args, **kwargs)
        # students may only update their submission before grading
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        if instance.student != user:
            return Response({'detail': 'Cannot modify others submissions.'}, status=status.HTTP_403_FORBIDDEN)
        allowed = ['status']
        data = {k: v for k, v in request.data.items() if k in allowed}
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class TestAnswerViewSet(BaseModelViewSet):
    queryset = TestAnswer.objects.all()
    serializer_class = TestAnswerSerializer
    
    def _recalculate_submission(self, submission_id):
        try:
            submission = TestSubmission.objects.get(id=submission_id)
        except TestSubmission.DoesNotExist:
            return

        answers = submission.answers.all()
        total_awarded = 0.0
        for a in answers:
            # prefer stored marks_awarded; if missing, attempt to infer from question.correct_answer
            if a.marks_awarded is not None:
                try:
                    total_awarded += float(a.marks_awarded)
                except Exception:
                    pass
            else:
                try:
                    correct = (a.question.correct_answer or '').strip().lower()
                    ans = (a.student_answer or '').strip().lower()
                    if correct and ans and correct == ans:
                        total_awarded += float(a.question.marks or 0)
                except Exception:
                    pass

        submission.marks_obtained = total_awarded
        # compute percentage and grade if possible
        try:
            percentage = 0
            if submission.test and submission.test.total_marks and float(submission.test.total_marks) > 0:
                percentage = round((total_awarded / float(submission.test.total_marks)) * 100)
            # Simple grade mapping
            if percentage >= 90:
                grade = 'A+'
            elif percentage >= 85:
                grade = 'A'
            elif percentage >= 80:
                grade = 'A-'
            elif percentage >= 75:
                grade = 'B+'
            elif percentage >= 70:
                grade = 'B'
            elif percentage >= 65:
                grade = 'B-'
            elif percentage >= 60:
                grade = 'C+'
            elif percentage >= 55:
                grade = 'C'
            elif percentage >= 50:
                grade = 'C-'
            else:
                grade = 'F'
            submission.grade = grade
        except Exception:
            pass

        submission.save()

    def create(self, request, *args, **kwargs):
        # Normalize common client-side field aliases to ensure student_answer is persisted
        data = dict(request.data)
        # Accept alias keys: studentAnswer, answer, student_answer_text
        if 'student_answer' not in data:
            if 'studentAnswer' in data:
                data['student_answer'] = data.pop('studentAnswer')
            elif 'answer' in data:
                data['student_answer'] = data.pop('answer')
            elif 'student_answer_text' in data:
                data['student_answer'] = data.pop('student_answer_text')

        # Ensure submission key exists under expected name
        if 'submission' not in data and 'submission_id' in data:
            data['submission'] = data.pop('submission_id')

        # Provide fallback empty string instead of None to avoid nulls if client omitted key
        if 'student_answer' not in data or data.get('student_answer') is None:
            data['student_answer'] = ''

        # Validate submission existence and permissions
        submission_id = data.get('submission') or data.get('submission_id')
        if not submission_id:
            return Response({'detail': 'submission field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            submission_obj = TestSubmission.objects.get(id=submission_id)
        except TestSubmission.DoesNotExist:
            return Response({'detail': 'submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not user or not user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_403_FORBIDDEN)

        # Students may only create answers for their own submissions
        if getattr(user, 'role', None) == 'student' and submission_obj.student != user:
            return Response({'detail': 'Cannot add answers for other students.'}, status=status.HTTP_403_FORBIDDEN)

        # Teachers may create/update answers for submissions only if they teach the course or created the test
        if getattr(user, 'role', None) == 'teacher':
            course_instructor = getattr(submission_obj.test.course, 'instructor', None)
            if course_instructor != user and getattr(submission_obj.test, 'created_by', None) != user and getattr(user, 'role', None) != 'admin':
                return Response({'detail': 'Teacher not authorized for this submission.'}, status=status.HTTP_403_FORBIDDEN)

        # Use serializer flow to create answer(s)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        # Recalculate submission aggregates
        submission_id = serializer.data.get('submission') or data.get('submission')
        try:
            if submission_id:
                self._recalculate_submission(submission_id)
        except Exception:
            pass

        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        # After updating an answer, recalculate submission totals
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = dict(request.data)
        # Normalize aliases same as create
        if 'student_answer' not in data:
            if 'studentAnswer' in data:
                data['student_answer'] = data.pop('studentAnswer')
            elif 'answer' in data:
                data['student_answer'] = data.pop('answer')
            elif 'student_answer_text' in data:
                data['student_answer'] = data.pop('student_answer_text')

        if 'submission' not in data and 'submission_id' in data:
            data['submission'] = data.pop('submission_id')

        # default empty string for missing answer
        if 'student_answer' not in data or data.get('student_answer') is None:
            data['student_answer'] = ''

        # Permission checks: students may only update their own answers
        user = request.user
        if not user or not user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_403_FORBIDDEN)

        if getattr(user, 'role', None) == 'student' and instance.submission and instance.submission.student != user:
            return Response({'detail': 'Cannot modify answers for other students.'}, status=status.HTTP_403_FORBIDDEN)

        if getattr(user, 'role', None) == 'teacher':
            # Ensure teacher is allowed to modify this submission's answers
            course_instructor = getattr(instance.submission.test.course, 'instructor', None) if instance.submission and instance.submission.test else None
            if course_instructor != user and getattr(instance.submission.test, 'created_by', None) != user and getattr(user, 'role', None) != 'admin':
                return Response({'detail': 'Teacher not authorized for this submission.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        submission_id = serializer.data.get('submission') or data.get('submission') or (instance.submission.id if instance.submission else None)
        try:
            if submission_id:
                self._recalculate_submission(submission_id)
        except Exception:
            pass

        return Response(serializer.data)


class AttendanceRecordViewSet(BaseModelViewSet):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer


class LibraryItemViewSet(BaseModelViewSet):
    queryset = LibraryItem.objects.all()
    serializer_class = LibraryItemSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('title', 'category', 'subject')
    ordering_fields = ('upload_date', 'title')
    from .permissions import IsTeacherOrAdmin
    write_permission_classes = [IsTeacherOrAdmin]


class LibraryFavoriteViewSet(BaseModelViewSet):
    queryset = LibraryFavorite.objects.all()
    serializer_class = LibraryFavoriteSerializer


class LibraryDownloadViewSet(BaseModelViewSet):
    queryset = LibraryDownload.objects.all()
    serializer_class = LibraryDownloadSerializer


class EventViewSet(BaseModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    from .permissions import IsTeacherOrAdmin
    write_permission_classes = [IsTeacherOrAdmin]


class LiveClassViewSet(BaseModelViewSet):
    queryset = LiveClass.objects.all()
    serializer_class = LiveClassSerializer
    from .permissions import IsTeacherOrAdmin
    write_permission_classes = [IsTeacherOrAdmin]

    def perform_create(self, serializer):
        # If instructor not provided and user is a teacher/admin, set it
        user = getattr(self.request, 'user', None)
        if user and getattr(user, 'role', None) in ('teacher', 'admin'):
            return serializer.save(instructor=user)
        return serializer.save()

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except (IntegrityError, DatabaseError):
            logger.exception('Live class create failed due to database error for user_id=%s', getattr(request.user, 'pk', None))
            return Response({'detail': 'Unable to create live class due to a database error.'}, status=status.HTTP_409_CONFLICT)
        except Exception:
            logger.exception('Unexpected live class creation failure for user_id=%s', getattr(request.user, 'pk', None))
            return Response({'detail': 'Unexpected server error creating live class.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # push/pop participant actions removed since `participants` field was removed from the model


class AnnouncementViewSet(BaseModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    from .permissions import IsTeacherOrAdmin
    write_permission_classes = [IsTeacherOrAdmin]
    
    def get_queryset(self):
        """
        Announcements are visible to all authenticated users (not filtered by role).
        They are filtered by is_archived status to exclude archived announcements.
        """
        # Get base queryset without role-based filtering
        qs = self.queryset if self.queryset is not None else super(BaseModelViewSet, self).get_queryset()
        # Exclude archived announcements for all users
        return qs.filter(is_archived=False)
    
    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)

            try:
                ann_id = serializer.data.get('id') or serializer.data.get('pk')
                if ann_id:
                    try:
                        ann_obj = Announcement.objects.get(id=ann_id)
                    except Exception:
                        ann_obj = None
                else:
                    ann_obj = None

                if ann_obj:
                    channels = (ann_obj.channels or [])
                    audience = (ann_obj.audience or '').lower() if ann_obj.audience else 'all'

                    # Determine recipients
                    users_qs = None
                    if audience == 'students':
                        users_qs = User.objects.filter(role='student').exclude(email__isnull=True).exclude(email='')
                    elif audience == 'teachers':
                        users_qs = User.objects.filter(role='teacher').exclude(email__isnull=True).exclude(email='')
                    else:
                        users_qs = User.objects.exclude(email__isnull=True).exclude(email='')

                    # Send emails if requested and email backend configured
                    if 'email' in channels and users_qs.exists():
                        logger = logging.getLogger(__name__)
                        try:
                            recipient_list = list(filter(None, set(users_qs.values_list('email', flat=True))))
                            if recipient_list:
                                from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'no-reply@example.com'
                                subject = ann_obj.title or 'Announcement'
                                message = ann_obj.body or ''
                                # Send in batches to avoid SMTP limits for large recipient lists
                                batch_size = getattr(settings, 'ANNOUNCEMENT_EMAIL_BATCH_SIZE', 100)
                                smtp_host = getattr(settings, 'EMAIL_HOST', None)
                                smtp_port = getattr(settings, 'EMAIL_PORT', None)
                                for i in range(0, len(recipient_list), batch_size):
                                    batch = recipient_list[i:i+batch_size]
                                    try:
                                        send_mail(subject, message, from_email, batch, fail_silently=False)
                                    except Exception as e_batch:
                                        logger.error('Failed to send announcement email batch (%d-%d) via SMTP %s:%s: %s', i, i+len(batch), smtp_host, smtp_port, e_batch)
                        except Exception:
                            logger.exception('Failed to prepare/send announcement emails')

                    # Send SMS if requested and Twilio config exists
                    if 'sms' in channels:
                        tw_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
                        tw_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
                        tw_from = getattr(settings, 'TWILIO_FROM_NUMBER', None)
                        if tw_sid and tw_token and tw_from:
                            # Collect phone numbers from users (both students and teachers depending on audience)
                            phone_qs = None
                            if audience == 'students':
                                phone_qs = User.objects.filter(role='student').exclude(phone__isnull=True).exclude(phone='')
                            elif audience == 'teachers':
                                phone_qs = User.objects.filter(role='teacher').exclude(phone__isnull=True).exclude(phone='')
                            else:
                                phone_qs = User.objects.exclude(phone__isnull=True).exclude(phone='')

                            for phone in phone_qs.values_list('phone', flat=True):
                                try:
                                    payload = {'From': tw_from, 'To': phone, 'Body': ann_obj.body or ann_obj.title}
                                    url = f'https://api.twilio.com/2010-04-01/Accounts/{tw_sid}/Messages.json'
                                    r = requests.post(url, data=payload, auth=(tw_sid, tw_token), timeout=10)
                                    if r.status_code >= 400:
                                        logger.warning('Twilio SMS send failed for %s status=%s', phone, r.status_code)
                                except Exception:
                                    logger.exception('Error sending SMS to %s', phone)
                        else:
                            logger.warning('SMS channel requested but Twilio is not configured')

            except Exception as notify_exc:
                logger.exception('Error while sending announcement notifications: %s', notify_exc)

            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception:
            logger.exception('Unexpected error creating announcement for user_id=%s', getattr(request.user, 'pk', None))
            return Response({'detail': 'Unexpected server error creating announcement.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UploadViewSet(BaseModelViewSet):
    queryset = Upload.objects.all()
    serializer_class = UploadSerializer

    def create(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        # validate file size and type
        max_mb = getattr(settings, 'MAX_UPLOAD_MB', 20)
        allowed_types = getattr(settings, 'ALLOWED_UPLOAD_MIME_TYPES', ['application/pdf', 'image/png', 'image/jpeg', 'video/mp4', 'application/zip'])
        if file.size > max_mb * 1024 * 1024:
            return Response({'detail': f'File too large. Max {max_mb} MB.'}, status=status.HTTP_400_BAD_REQUEST)

        # Prefer content-based detection when python-magic is available.
        detected_mime = None
        try:
            import magic
            # read a small sample from the uploaded file without consuming it
            sample = file.read(2048)
            file.seek(0)
            detected_mime = magic.from_buffer(sample, mime=True)
        except Exception:
            detected_mime = None

        # If magic couldn't detect a specific MIME (or returned generic
        # application/octet-stream), fall back to the provided content_type
        # or infer from the filename extension so common archive uploads
        # like ZIPs aren't rejected spuriously.
        import mimetypes
        fallback_ct = getattr(file, 'content_type', None)
        if not detected_mime or detected_mime == 'application/octet-stream':
            ext_ct, _ = mimetypes.guess_type(file.name)
            content_type = ext_ct or fallback_ct or 'application/octet-stream'
        else:
            content_type = detected_mime

        if allowed_types and content_type not in allowed_types:
            detail = f'Invalid file type: {fallback_ct}'
            if detected_mime:
                detail += f' (detected: {detected_mime})'
            return Response({'detail': detail}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure local media directory exists when using FileSystemStorage
        try:
            from django.core.files.storage import FileSystemStorage
            if isinstance(default_storage, FileSystemStorage):
                import os
                media_root = getattr(settings, 'MEDIA_ROOT', None)
                if media_root:
                    try:
                        os.makedirs(str(media_root), exist_ok=True)
                    except Exception:
                        # ignore directory create errors; storage.save will surface them
                        pass

            # Save file using configured storage backend (S3, local FS, etc.)
            path = default_storage.save(file.name, file)
            url = default_storage.url(path)
            upload = Upload.objects.create(file_name=file.name, file_url=url, uploaded_by=request.user if request.user.is_authenticated else None)
            return Response({'id': upload.id, 'url': url}, status=status.HTTP_201_CREATED)
        except Exception:
            logger.exception('Failed to save uploaded file for user_id=%s', getattr(request.user, 'pk', None))
            return Response({'detail': 'Failed to save uploaded file'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StudentProfileViewSet(BaseModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer


class TeacherProfileViewSet(BaseModelViewSet):
    queryset = TeacherProfile.objects.all()
    serializer_class = TeacherProfileSerializer


class AdminProfileViewSet(BaseModelViewSet):
    queryset = AdminProfile.objects.all()
    serializer_class = AdminProfileSerializer


class UserSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for user settings - users can only access their own settings"""
    serializer_class = UserSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own settings
        return UserSettings.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # Create settings for the current user
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        """Get or update current user's settings"""
        # Get or create settings for current user
        settings, created = UserSettings.objects.get_or_create(user=request.user)
        
        if request.method == 'GET':
            serializer = self.get_serializer(settings)
            return Response(serializer.data)
        
        # Handle PUT/PATCH
        partial = request.method == 'PATCH'
        serializer = self.get_serializer(settings, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for activity logs - admin only access"""
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only admins can view activity logs
        if self.request.user and self.request.user.role == 'admin':
            try:
                return ActivityLog.objects.all().order_by('-created_at')[:50]  # Last 50 activities
            except Exception:
                # Return empty queryset if database is unavailable
                return ActivityLog.objects.none()
        return ActivityLog.objects.none()


class SystemAlertViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for system alerts - admin only access"""
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    
    def get_queryset(self):
        # Only admins can view system alerts
        if self.request.user and self.request.user.role == 'admin':
            try:
                # Return active and recent alerts, sorted by severity then creation date
                return SystemAlert.objects.all().order_by('-severity', '-created_at')[:20]
            except Exception:
                # Return empty queryset if database is unavailable
                return SystemAlert.objects.none()
        return SystemAlert.objects.none()


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user notifications.
    
    - Anonymous users cannot access notifications
    - Authenticated users can see their own notifications
    - Supports filtering by read status via query parameter: ?read=true|false
    - Supports pagination via limit and offset query parameters
    - Custom actions: mark-as-read/<id>/, mark-all-as-read/
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Notification.objects.filter(user=user).order_by('-created_at')
        read_param = self.request.query_params.get('read', None)
        if read_param is not None:
            queryset = queryset.filter(read=read_param.lower() in ['true', '1', 'yes'])
        return queryset
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """
        Mark a specific notification as read.
        """
        try:
            notification = self.get_object()
            if notification.user != request.user:
                return Response(
                    {'detail': 'You can only mark your own notifications as read.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            notification.read = True
            notification.read_at = timezone.now()
            notification.save()
            serializer = self.get_serializer(notification)
            return Response(serializer.data)
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception:
            logger.exception('Error marking notification as read for user_id=%s', request.user.pk)
            return Response({'detail': 'Error marking notification as read.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """
        Mark all notifications for the current user as read.
        """
        try:
            user = request.user
            notifications = Notification.objects.filter(user=user, read=False)
            count = notifications.update(read=True, read_at=timezone.now())
            return Response({
                'detail': f'Marked {count} notifications as read.',
                'count': count
            })
        except Exception as e:
            logger.exception('Error marking all notifications as read for user_id=%s', request.user.pk)
            return Response({'detail': 'Error marking notifications as read.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'], url_path='delete-all')
    def delete_all(self, request):
        try:
            deleted_count, _ = Notification.objects.filter(user=request.user).delete()
            return Response({'detail': f'Deleted {deleted_count} notifications.', 'count': deleted_count})
        except Exception:
            logger.exception('Error deleting all notifications for user_id=%s', request.user.pk)
            return Response({'detail': 'Error deleting notifications.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CourseRatingViewSet(BaseModelViewSet):
    """
    ViewSet for course ratings. Students can rate courses they are enrolled in.
    Ratings cannot be updated or deleted once submitted.
    """
    queryset = CourseRating.objects.all()
    serializer_class = CourseRatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter ratings by course if course parameter is provided."""
        qs = super().get_queryset()
        course_id = self.request.query_params.get('course')
        if course_id:
            try:
                qs = qs.filter(course_id=course_id)
            except Exception:
                pass
        return qs
    
    def create(self, request, *args, **kwargs):
        """Create a rating for a course. Ratings cannot be updated once created."""
        user = request.user
        course_id = request.data.get('course')
        rating_value = request.data.get('rating')
        review = request.data.get('review', '')
        
        if not course_id:
            return Response({'detail': 'course field is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not rating_value:
            return Response({'detail': 'rating field is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({'detail': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user already has a rating for this course
        existing_rating = CourseRating.objects.filter(course=course, student=user).exists()
        if existing_rating:
            return Response(
                {'detail': 'You have already rated this course. Ratings cannot be updated.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is enrolled in the course
        if user.role == 'student':
            enrollment_exists = Enrollment.objects.filter(student=user, course=course).exists()
            if not enrollment_exists:
                return Response(
                    {'detail': 'You must be enrolled in this course to rate it.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Create rating
        rating = CourseRating.objects.create(
            course=course,
            student=user,
            rating=rating_value,
            review=review
        )
        
        # Update course average rating
        from django.db.models import Avg
        avg_rating = CourseRating.objects.filter(course=course).aggregate(avg=Avg('rating'))['avg']
        course.average_rating = round(avg_rating, 2) if avg_rating else 0
        course.save(update_fields=['average_rating'])
        
        serializer = self.get_serializer(rating)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update is not allowed for ratings."""
        return Response(
            {'detail': 'Ratings cannot be updated once submitted.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    def partial_update(self, request, *args, **kwargs):
        """Partial update is not allowed for ratings."""
        return Response(
            {'detail': 'Ratings cannot be updated once submitted.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    def destroy(self, request, *args, **kwargs):
        """Delete is not allowed for ratings."""
        return Response(
            {'detail': 'Ratings cannot be deleted once submitted.'},
            status=status.HTTP_403_FORBIDDEN
        )
