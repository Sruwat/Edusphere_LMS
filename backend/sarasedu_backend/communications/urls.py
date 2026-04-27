from rest_framework.routers import DefaultRouter

from core import viewsets

router = DefaultRouter()
router.register(r"events", viewsets.EventViewSet)
router.register(r"live-classes", viewsets.LiveClassViewSet)
router.register(r"announcements", viewsets.AnnouncementViewSet)

urlpatterns = router.urls

