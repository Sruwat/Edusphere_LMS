from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Course, Enrollment
from games.catalog import DEFAULT_GAMES
from games.models import Game, GameAssignment, GameAttempt, GameBadge
from games.viewsets import ensure_default_games

User = get_user_model()


class GamesWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username="gameteacher",
            email="gameteacher@example.com",
            password="StrongPass123!",
            role="teacher",
        )
        self.student = User.objects.create_user(
            username="gamestudent",
            email="gamestudent@example.com",
            password="StrongPass123!",
            role="student",
        )
        self.other_student = User.objects.create_user(
            username="nogameaccess",
            email="nogameaccess@example.com",
            password="StrongPass123!",
            role="student",
        )
        self.course = Course.objects.create(
            title="Games Course",
            instructor=self.teacher,
            status="active",
            is_published=True,
        )
        Enrollment.objects.create(student=self.student, course=self.course, status="active")
        ensure_default_games()
        self.game = Game.objects.get(slug=DEFAULT_GAMES[0]["slug"])
        self.assignment = GameAssignment.objects.create(
            game=self.game,
            course=self.course,
            assigned_by=self.teacher,
            title="Play once",
            max_attempts=1,
        )

    def test_student_can_start_and_submit_game_attempt(self):
        self.client.force_authenticate(user=self.student)
        start_response = self.client.post(
            f"/api/games/{self.game.slug}/start/",
            {"assignment_id": self.assignment.id},
            format="json",
        )
        self.assertEqual(start_response.status_code, 201)

        submit_response = self.client.post(
            f"/api/games/{self.game.slug}/submit/",
            {"assignment_id": self.assignment.id, "session_id": start_response.data["id"], "score": 95, "accuracy": 95, "streak": 2},
            format="json",
        )
        self.assertEqual(submit_response.status_code, 201)
        self.assertEqual(GameAttempt.objects.count(), 1)
        self.assertEqual(GameBadge.objects.filter(student=self.student, game=self.game).count(), 1)

    def test_max_attempts_is_enforced(self):
        self.client.force_authenticate(user=self.student)
        first_session = self.client.post(
            f"/api/games/{self.game.slug}/start/",
            {"assignment_id": self.assignment.id},
            format="json",
        )
        self.client.post(
            f"/api/games/{self.game.slug}/submit/",
            {"assignment_id": self.assignment.id, "session_id": first_session.data["id"], "score": 80, "accuracy": 80},
            format="json",
        )

        second_session = self.client.post(
            f"/api/games/{self.game.slug}/start/",
            {"assignment_id": self.assignment.id},
            format="json",
        )
        blocked_response = self.client.post(
            f"/api/games/{self.game.slug}/submit/",
            {"assignment_id": self.assignment.id, "session_id": second_session.data["id"], "score": 82, "accuracy": 82},
            format="json",
        )

        self.assertEqual(blocked_response.status_code, 400)

    def test_unenrolled_student_cannot_start_course_assignment(self):
        self.client.force_authenticate(user=self.other_student)
        response = self.client.post(
            f"/api/games/{self.game.slug}/start/",
            {"assignment_id": self.assignment.id},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
