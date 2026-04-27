from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from core import viewsets
from core.views import (
    ChangePasswordView,
    CustomTokenObtainPairView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    UserDetailView,
    UserListView,
    MeView,
)

router = DefaultRouter()
router.register(r"student-profiles", viewsets.StudentProfileViewSet)
router.register(r"teacher-profiles", viewsets.TeacherProfileViewSet)
router.register(r"admin-profiles", viewsets.AdminProfileViewSet)
router.register(r"user-settings", viewsets.UserSettingsViewSet, basename="user-settings")
router.register(r"activity-logs", viewsets.ActivityLogViewSet, basename="activity-logs")
router.register(r"system-alerts", viewsets.SystemAlertViewSet, basename="system-alerts")
router.register(r"notifications", viewsets.NotificationViewSet, basename="notifications")

urlpatterns = [
    path("auth/login", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/register", RegisterView.as_view(), name="auth_register"),
    path("auth/refresh", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me", MeView.as_view(), name="auth_me"),
    path("auth/change-password", ChangePasswordView.as_view(), name="auth_change_password"),
    path("auth/password-reset", PasswordResetRequestView.as_view(), name="auth_password_reset"),
    path("auth/password-reset/confirm", PasswordResetConfirmView.as_view(), name="auth_password_reset_confirm"),
    path("users", UserListView.as_view(), name="user_list"),
    path("users/<int:id>", UserDetailView.as_view(), name="user_detail"),
    *router.urls,
]
