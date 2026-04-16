from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ('teacher', 'admin'))


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and getattr(obj, 'user', None) == request.user)


class IsInstructorOrAdmin(permissions.BasePermission):
    """Object-level permission to allow only the course instructor or admins to edit/delete."""
    def has_object_permission(self, request, view, obj):
        # Allow safe methods
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not (user and user.is_authenticated):
            return False
        # Admins can do anything
        if getattr(user, 'role', None) == 'admin':
            return True
        # If object has 'instructor' attribute, check equality
        instructor = getattr(obj, 'instructor', None)
        return instructor == user
