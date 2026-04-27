from django.urls import path
from rest_framework.routers import DefaultRouter

from core import viewsets
from core.views import AssignmentSubmitView

router = DefaultRouter()
router.register(r"assignments", viewsets.AssignmentViewSet)
router.register(r"assignment-submissions", viewsets.AssignmentSubmissionViewSet)
router.register(r"assignment-attachments", viewsets.AssignmentAttachmentViewSet)
router.register(r"tests", viewsets.TestViewSet)
router.register(r"questions", viewsets.QuestionViewSet)
router.register(r"test-submissions", viewsets.TestSubmissionViewSet)
router.register(r"test-answers", viewsets.TestAnswerViewSet)
router.register(r"attendance", viewsets.AttendanceRecordViewSet)

urlpatterns = [
    path("assignments/<int:id>/submissions", AssignmentSubmitView.as_view(), name="assignment_submit"),
    *router.urls,
]

