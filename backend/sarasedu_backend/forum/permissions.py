from rest_framework import permissions

from core.models import Enrollment


class CanAccessCourseForum(permissions.BasePermission):
    def has_permission(self, request, view):
        course_id = request.data.get("course_id") or request.query_params.get("course")
        if not request.user or not request.user.is_authenticated:
            return request.method in permissions.SAFE_METHODS
        if getattr(request.user, "role", None) in ("admin", "teacher"):
            return True
        if not course_id:
            return True
        return Enrollment.objects.filter(course_id=course_id, student=request.user).exists()

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return request.method in permissions.SAFE_METHODS
        if getattr(user, "role", None) in ("admin", "teacher"):
            return True
        course = getattr(obj, "course", None) or getattr(getattr(obj, "thread", None), "course", None)
        if request.method in permissions.SAFE_METHODS:
            return True
        return course and Enrollment.objects.filter(course=course, student=user).exists()

