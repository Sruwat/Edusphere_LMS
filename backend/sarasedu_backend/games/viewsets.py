from decimal import Decimal

from django.db.models import Avg, Max
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import Course, Enrollment
from .catalog import DEFAULT_GAMES
from .models import Game, GameAssignment, GameAttempt, GameBadge, GameLeaderboard, GameScore, GameSession
from .serializers import (
    GameAssignmentSerializer,
    GameAttemptSerializer,
    GameBadgeSerializer,
    GameLeaderboardSerializer,
    GameScoreSerializer,
    GameSerializer,
    GameSessionSerializer,
)


def ensure_default_games():
    for item in DEFAULT_GAMES:
        Game.objects.update_or_create(slug=item["slug"], defaults=item)


def _rebuild_leaderboard(game, assignment=None, scope="global"):
    attempts = GameAttempt.objects.filter(game=game)
    if assignment:
        attempts = attempts.filter(assignment=assignment)
    best_by_student = {}
    for attempt in attempts.order_by("-score", "submitted_at"):
        best_by_student.setdefault(attempt.student_id, attempt)
    for rank, attempt in enumerate(best_by_student.values(), start=1):
        GameLeaderboard.objects.update_or_create(
            game=game,
            assignment=assignment,
            student=attempt.student,
            scope=scope,
            defaults={"score": attempt.score, "rank": rank},
        )


class GameViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Game.objects.filter(is_active=True)
    serializer_class = GameSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = "slug"

    def get_queryset(self):
        ensure_default_games()
        queryset = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)
        return queryset

    @action(detail=True, methods=["post"])
    def start(self, request, slug=None):
        game = self.get_object()
        assignment_id = request.data.get("assignment_id")
        assignment = GameAssignment.objects.filter(id=assignment_id).first() if assignment_id else None
        if assignment and getattr(request.user, "role", None) == "student":
            if not Enrollment.objects.filter(course=assignment.course, student=request.user, status="active").exists():
                return Response({"detail": "You must be enrolled in this course to play this assignment."}, status=status.HTTP_403_FORBIDDEN)
        session = GameSession.objects.create(game=game, assignment=assignment, student=request.user, metadata={"started_from": "dashboard"})
        return Response(GameSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def submit(self, request, slug=None):
        game = self.get_object()
        assignment = GameAssignment.objects.filter(id=request.data.get("assignment_id")).first() if request.data.get("assignment_id") else None
        session = GameSession.objects.filter(id=request.data.get("session_id"), student=request.user, game=game).first()
        attempts_count = GameAttempt.objects.filter(game=game, student=request.user, assignment=assignment).count()
        if assignment and assignment.max_attempts and attempts_count >= assignment.max_attempts:
            return Response({"detail": "Maximum attempts reached for this assignment."}, status=status.HTTP_400_BAD_REQUEST)
        attempt = GameAttempt.objects.create(
            game=game,
            assignment=assignment,
            session=session,
            student=request.user,
            attempt_number=attempts_count + 1,
            score=Decimal(str(request.data.get("score", 0))),
            max_score=Decimal(str(request.data.get("max_score", 100))),
            accuracy=Decimal(str(request.data.get("accuracy", 0))),
            streak=int(request.data.get("streak", 0) or 0),
            payload=request.data.get("payload") or {},
        )
        if session:
            session.status = "submitted"
            session.submitted_at = timezone.now()
            session.metadata = {**session.metadata, "latest_attempt_id": attempt.id}
            session.save(update_fields=["status", "submitted_at", "metadata"])

        score, _ = GameScore.objects.get_or_create(game=game, student=request.user)
        user_attempts = GameAttempt.objects.filter(game=game, student=request.user)
        score.best_score = user_attempts.aggregate(max_score=Max("score"))["max_score"] or 0
        score.average_score = user_attempts.aggregate(avg_score=Avg("score"))["avg_score"] or 0
        score.attempts_count = user_attempts.count()
        score.current_streak = attempt.streak
        score.save()

        _rebuild_leaderboard(game, assignment=assignment, scope="course" if assignment else "global")

        if attempt.score >= 90 and not GameBadge.objects.filter(game=game, student=request.user, name="High Scorer").exists():
            GameBadge.objects.create(game=game, student=request.user, name="High Scorer", description="Scored 90 or above", icon="Award")

        return Response(
            {
                "attempt": GameAttemptSerializer(attempt).data,
                "score": GameScoreSerializer(score).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def leaderboard(self, request, slug=None):
        game = self.get_object()
        assignment_id = request.query_params.get("assignment_id")
        assignment = GameAssignment.objects.filter(id=assignment_id).first() if assignment_id else None
        scope = "course" if assignment else "global"
        _rebuild_leaderboard(game, assignment=assignment, scope=scope)
        entries = GameLeaderboard.objects.filter(game=game, assignment=assignment, scope=scope).select_related("student").order_by("rank", "-score")
        return Response(GameLeaderboardSerializer(entries, many=True).data)


class GameAssignmentViewSet(viewsets.ModelViewSet):
    queryset = GameAssignment.objects.select_related("game", "course", "assigned_by").all()
    serializer_class = GameAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = getattr(self.request.user, "role", None)
        if role == "student":
            enrolled_course_ids = Enrollment.objects.filter(student=self.request.user, status="active").values_list("course_id", flat=True)
            queryset = queryset.filter(course_id__in=enrolled_course_ids, is_published=True)
        elif role == "teacher":
            queryset = queryset.filter(course__instructor=self.request.user)
        course_id = self.request.query_params.get("course")
        game_id = self.request.query_params.get("game")
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        if game_id:
            queryset = queryset.filter(game_id=game_id)
        return queryset

    def perform_create(self, serializer):
        course = Course.objects.get(id=self.request.data.get("course_id"))
        game = Game.objects.get(id=self.request.data.get("game_id"))
        serializer.save(course=course, game=game, assigned_by=self.request.user)


class GameBadgeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GameBadge.objects.select_related("game", "student").all()
    serializer_class = GameBadgeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = getattr(self.request.user, "role", None)
        if role == "student":
            queryset = queryset.filter(student=self.request.user)
        return queryset
