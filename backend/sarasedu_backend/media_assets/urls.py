from rest_framework.routers import DefaultRouter

from core import viewsets

router = DefaultRouter()
router.register(r"uploads", viewsets.UploadViewSet)

urlpatterns = router.urls

