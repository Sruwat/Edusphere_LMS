from django.db.models import Count
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers

from core.models import Course, Enrollment
from .models import ForumCategory, Post, Report, Thread, ThreadSubscription
from .permissions import CanAccessCourseForum
from .serializers import (
    ForumCategorySerializer,
    PostSerializer,
    ReportSerializer,
    ThreadSerializer,
    ThreadSubscriptionSerializer,
)


class ForumCategoryViewSet(viewsets.ModelViewSet):
    queryset = ForumCategory.objects.select_related("course").all()
    serializer_class = ForumCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        course_id = self.request.data.get("course_id")
        course = Course.objects.filter(id=course_id).first() if course_id else None
        serializer.save(course=course)


class ThreadViewSet(viewsets.ModelViewSet):
    queryset = Thread.objects.select_related("course", "category", "created_by").prefetch_related("posts", "subscriptions").all()
    serializer_class = ThreadSerializer
    permission_classes = [CanAccessCourseForum]

    def get_queryset(self):
        qs = self.queryset
        course = self.request.query_params.get("course")
        if course:
            qs = qs.filter(course_id=course)
        if getattr(self.request.user, "role", None) == "student":
            qs = qs.exclude(status="hidden")
        return qs

    def perform_create(self, serializer):
        course_id = self.request.data.get("course_id")
        course = Course.objects.filter(id=course_id).first()
        if not course:
            raise serializers.ValidationError({"course_id": "Valid course is required."})
        if not course.allow_discussions:
            raise serializers.ValidationError({"course_id": "Discussions are disabled for this course."})
        if getattr(self.request.user, "role", None) == "student" and not Enrollment.objects.filter(course=course, student=self.request.user).exists():
            raise serializers.ValidationError({"course_id": "You must be enrolled to create a thread."})
        category = None
        category_id = self.request.data.get("category_id")
        if category_id:
            category = ForumCategory.objects.filter(id=category_id).first()
        thread = serializer.save(course=course, category=category, created_by=self.request.user)
        ThreadSubscription.objects.get_or_create(thread=thread, user=self.request.user)

    @action(detail=True, methods=["get", "post"], url_path="posts")
    def posts(self, request, pk=None):
        thread = self.get_object()
        if request.method == "GET":
            posts = thread.posts.filter(parent__isnull=True, is_hidden=False)
            return Response(PostSerializer(posts, many=True, context={"request": request}).data)
        if thread.is_locked and getattr(request.user, "role", None) not in ("admin", "teacher"):
            return Response({"detail": "Thread is locked."}, status=status.HTTP_403_FORBIDDEN)
        serializer = PostSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        parent = None
        parent_id = request.data.get("parent")
        if parent_id:
            parent = Post.objects.filter(id=parent_id, thread=thread).first()
        post = serializer.save(thread=thread, author=request.user, parent=parent)
        thread.reply_count = thread.posts.filter(parent__isnull=False).count()
        thread.last_post_at = post.created_at
        thread.save(update_fields=["reply_count", "last_post_at"])
        return Response(PostSerializer(post, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def subscribe(self, request, pk=None):
        thread = self.get_object()
        subscription, created = ThreadSubscription.objects.get_or_create(thread=thread, user=request.user)
        serializer = ThreadSubscriptionSerializer(subscription)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def unsubscribe(self, request, pk=None):
        thread = self.get_object()
        deleted, _ = ThreadSubscription.objects.filter(thread=thread, user=request.user).delete()
        return Response({"detail": "Unsubscribed." if deleted else "Subscription not found.", "deleted": deleted})

    @action(detail=True, methods=["post"])
    def lock(self, request, pk=None):
        thread = self.get_object()
        if getattr(request.user, "role", None) not in ("admin", "teacher"):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        thread.is_locked = not thread.is_locked
        thread.save(update_fields=["is_locked"])
        return Response({"id": thread.id, "is_locked": thread.is_locked})

    @action(detail=True, methods=["post"])
    def pin(self, request, pk=None):
        thread = self.get_object()
        if getattr(request.user, "role", None) not in ("admin", "teacher"):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        thread.is_pinned = not thread.is_pinned
        thread.save(update_fields=["is_pinned"])
        return Response({"id": thread.id, "is_pinned": thread.is_pinned})

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        thread = self.get_object()
        if getattr(request.user, "role", None) not in ("admin", "teacher"):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        thread.status = "resolved" if thread.status != "resolved" else "open"
        thread.save(update_fields=["status"])
        return Response({"id": thread.id, "status": thread.status})

    @action(detail=True, methods=["post"])
    def hide(self, request, pk=None):
        thread = self.get_object()
        if getattr(request.user, "role", None) not in ("admin", "teacher"):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        thread.status = "hidden" if thread.status != "hidden" else "open"
        thread.save(update_fields=["status"])
        return Response({"id": thread.id, "status": thread.status})

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        thread = self.get_object()
        posts = thread.posts.filter(is_hidden=False)
        report_count = Report.objects.filter(post__thread=thread).count()
        return Response({
            "id": thread.id,
            "reply_count": thread.reply_count,
            "post_count": posts.count(),
            "subscriber_count": thread.subscriptions.count(),
            "report_count": report_count,
            "status": thread.status,
            "is_locked": thread.is_locked,
            "is_pinned": thread.is_pinned,
        })


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.select_related("thread", "author", "parent").prefetch_related("replies").all()
    serializer_class = PostSerializer
    permission_classes = [CanAccessCourseForum]

    def get_queryset(self):
        qs = self.queryset
        thread_id = self.request.query_params.get("thread")
        if thread_id:
            qs = qs.filter(thread_id=thread_id)
        return qs

    @action(detail=True, methods=["post"])
    def hide(self, request, pk=None):
        post = self.get_object()
        if getattr(request.user, "role", None) not in ("admin", "teacher"):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        post.is_hidden = not post.is_hidden
        post.save(update_fields=["is_hidden"])
        return Response({"id": post.id, "is_hidden": post.is_hidden})


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.select_related("post", "reporter").all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        report = self.get_object()
        if getattr(request.user, "role", None) not in ("admin", "teacher"):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        next_status = request.data.get("status") or "reviewed"
        if next_status not in {"open", "reviewed", "dismissed"}:
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        report.status = next_status
        report.save(update_fields=["status"])
        return Response(self.get_serializer(report).data)
