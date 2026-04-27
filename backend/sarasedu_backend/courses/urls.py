from django.urls import path
from rest_framework.routers import DefaultRouter

from core import viewsets
from core.views import CourseLecturesView

router = DefaultRouter()
router.register(r"courses", viewsets.CourseViewSet)
router.register(r"enrollments", viewsets.EnrollmentViewSet)
router.register(r"lecture-progress", viewsets.LectureProgressViewSet)
router.register(r"course-ratings", viewsets.CourseRatingViewSet, basename="course-ratings")

urlpatterns = [
    path("courses/<int:id>/lectures", CourseLecturesView.as_view(), name="course_lectures"),
    *router.urls,
]

