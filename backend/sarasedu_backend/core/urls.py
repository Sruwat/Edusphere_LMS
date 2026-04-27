from django.urls import include, path

urlpatterns = [
    path('', include('accounts.urls')),
    path('', include('courses.urls')),
    path('', include('content.urls')),
    path('', include('assessments.urls')),
    path('', include('communications.urls')),
    path('', include('media_assets.urls')),
    path('', include('ai.urls')),
    path('', include('forum.urls')),
    path('', include('games.urls')),
]
