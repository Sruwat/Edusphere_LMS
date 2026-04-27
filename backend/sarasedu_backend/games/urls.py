from rest_framework.routers import DefaultRouter

from .viewsets import GameAssignmentViewSet, GameBadgeViewSet, GameViewSet

router = DefaultRouter()
router.register(r"games", GameViewSet, basename="game")
router.register(r"game-assignments", GameAssignmentViewSet, basename="game-assignment")
router.register(r"game-badges", GameBadgeViewSet, basename="game-badge")

urlpatterns = router.urls
