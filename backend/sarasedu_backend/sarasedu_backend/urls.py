from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from rest_framework import permissions
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView


class DocsPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if settings.DEBUG:
            return True
        user = getattr(request, 'user', None)
        return bool(user and user.is_authenticated and getattr(user, 'role', None) in ('teacher', 'admin'))


def root_view(request):
    return JsonResponse({
        'name': 'SarasEdu Backend',
        'status': 'ok',
        'api': '/api/',
        'admin': '/admin/',
    })

urlpatterns = [
    path('', root_view),
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='api-schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='api-schema', permission_classes=[DocsPermission]), name='api-docs'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='api-schema', permission_classes=[DocsPermission]), name='api-redoc'),
    path('api/', include('core.urls')),
]
