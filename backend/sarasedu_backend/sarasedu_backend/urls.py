from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


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
    path('api/', include('core.urls')),
]
