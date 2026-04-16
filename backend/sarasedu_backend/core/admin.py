from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import Course, UserSettings

User = get_user_model()


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'email', 'role')
    search_fields = ('username', 'email')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'instructor', 'is_published', 'created_at')
    search_fields = ('title', 'instructor__username')


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ('user', 'theme', 'language', 'profile_visibility', 'email_notifications')
    search_fields = ('user__username', 'user__email')
    list_filter = ('theme', 'language', 'profile_visibility', 'email_notifications')
