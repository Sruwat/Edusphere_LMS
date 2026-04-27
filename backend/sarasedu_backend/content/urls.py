from django.urls import path
from rest_framework.routers import DefaultRouter

from core import viewsets
from core.views import LibraryDetailView, LibraryDownloadView, LibraryListCreateView

router = DefaultRouter()
router.register(r"lectures", viewsets.LectureViewSet)
router.register(r"lecture-materials", viewsets.LectureMaterialViewSet)
router.register(r"study-materials", viewsets.StudyMaterialViewSet)
router.register(r"library-items", viewsets.LibraryItemViewSet)
router.register(r"library-favorites", viewsets.LibraryFavoriteViewSet)
router.register(r"library-downloads", viewsets.LibraryDownloadViewSet)

urlpatterns = [
    path("library", LibraryListCreateView.as_view(), name="library_alias"),
    path("library/<int:id>", LibraryDetailView.as_view(), name="library_detail"),
    path("library/<int:id>/download", LibraryDownloadView.as_view(), name="library_download"),
    *router.urls,
]

