from rest_framework.routers import DefaultRouter

from .viewsets import ForumCategoryViewSet, PostViewSet, ReportViewSet, ThreadViewSet

router = DefaultRouter()
router.register(r"forum/categories", ForumCategoryViewSet, basename="forum-category")
router.register(r"forum/threads", ThreadViewSet, basename="forum-thread")
router.register(r"forum/posts", PostViewSet, basename="forum-post")
router.register(r"forum/reports", ReportViewSet, basename="forum-report")

urlpatterns = router.urls
