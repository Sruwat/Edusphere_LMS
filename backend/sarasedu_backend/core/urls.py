from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, me, CustomTokenObtainPairView, AIChatView, AIImageView, AITranscribeView,
    PasswordResetRequestView, PasswordResetConfirmView, ChangePasswordView,
    CourseLecturesView, UserDetailView, UserListView, LibraryListCreateView, LibraryDetailView, LibraryDownloadView, AssignmentSubmitView,
    DriveProxyView,
)
from rest_framework_simplejwt.views import TokenRefreshView
from . import viewsets

router = DefaultRouter()
router.register(r'courses', viewsets.CourseViewSet)
router.register(r'lectures', viewsets.LectureViewSet)
router.register(r'lecture-materials', viewsets.LectureMaterialViewSet)
router.register(r'study-materials', viewsets.StudyMaterialViewSet)
router.register(r'enrollments', viewsets.EnrollmentViewSet)
router.register(r'lecture-progress', viewsets.LectureProgressViewSet)
router.register(r'assignments', viewsets.AssignmentViewSet)
router.register(r'assignment-submissions', viewsets.AssignmentSubmissionViewSet)
router.register(r'assignment-attachments', viewsets.AssignmentAttachmentViewSet)
router.register(r'tests', viewsets.TestViewSet)
router.register(r'questions', viewsets.QuestionViewSet)
router.register(r'test-submissions', viewsets.TestSubmissionViewSet)
router.register(r'test-answers', viewsets.TestAnswerViewSet)
router.register(r'attendance', viewsets.AttendanceRecordViewSet)
router.register(r'library-items', viewsets.LibraryItemViewSet)
router.register(r'library-favorites', viewsets.LibraryFavoriteViewSet)
router.register(r'library-downloads', viewsets.LibraryDownloadViewSet)
router.register(r'events', viewsets.EventViewSet)
router.register(r'live-classes', viewsets.LiveClassViewSet)
router.register(r'announcements', viewsets.AnnouncementViewSet)
router.register(r'uploads', viewsets.UploadViewSet)
router.register(r'student-profiles', viewsets.StudentProfileViewSet)
router.register(r'teacher-profiles', viewsets.TeacherProfileViewSet)
router.register(r'admin-profiles', viewsets.AdminProfileViewSet)
router.register(r'user-settings', viewsets.UserSettingsViewSet, basename='user-settings')
router.register(r'activity-logs', viewsets.ActivityLogViewSet, basename='activity-logs')
router.register(r'system-alerts', viewsets.SystemAlertViewSet, basename='system-alerts')
router.register(r'notifications', viewsets.NotificationViewSet, basename='notifications')
router.register(r'course-ratings', viewsets.CourseRatingViewSet, basename='course-ratings')

urlpatterns = [
    path('auth/login', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/register', RegisterView.as_view(), name='auth_register'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me', me, name='auth_me'),
    path('auth/change-password', ChangePasswordView.as_view(), name='auth_change_password'),
    path('auth/password-reset', PasswordResetRequestView.as_view(), name='auth_password_reset'),
    path('auth/password-reset/confirm', PasswordResetConfirmView.as_view(), name='auth_password_reset_confirm'),
    path('ai/chat', AIChatView.as_view(), name='ai_chat'),
    path('ai/image', AIImageView.as_view(), name='ai_image'),
    path('ai/transcribe', AITranscribeView.as_view(), name='ai_transcribe'),
    path('courses/<int:id>/lectures', CourseLecturesView.as_view(), name='course_lectures'),
    path('video-proxy/', DriveProxyView.as_view(), name='video_proxy'),
    path('users', UserListView.as_view(), name='user_list'),
    path('users/<int:id>', UserDetailView.as_view(), name='user_detail'),
    path('library', LibraryListCreateView.as_view(), name='library_alias'),
    path('library/<int:id>', LibraryDetailView.as_view(), name='library_detail'),
    path('library/<int:id>/download', LibraryDownloadView.as_view(), name='library_download'),
    path('assignments/<int:id>/submissions', AssignmentSubmitView.as_view(), name='assignment_submit'),
    path('', include(router.urls)),
]
