from django.conf import settings
from django.db import models


class Game(models.Model):
    CATEGORY_CHOICES = (
        ("language", "Language"),
        ("quiz", "Quiz"),
        ("coding", "Coding"),
        ("logic", "Logic"),
    )

    slug = models.SlugField(max_length=100, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="quiz")
    difficulty = models.CharField(max_length=20, default="medium")
    icon = models.CharField(max_length=20, default="Gamepad2")
    upstream_source = models.TextField(blank=True, null=True)
    upstream_label = models.CharField(max_length=255, blank=True, null=True)
    estimated_minutes = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("title",)


class GameAssignment(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="assignments")
    course = models.ForeignKey("core.Course", on_delete=models.CASCADE, related_name="game_assignments")
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="created_game_assignments", null=True, blank=True)
    title = models.CharField(max_length=255)
    due_date = models.DateTimeField(null=True, blank=True)
    max_attempts = models.IntegerField(default=3)
    scoring_weight = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    leaderboard_visibility = models.CharField(max_length=20, default="course")
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class GameSession(models.Model):
    STATUS_CHOICES = (
        ("started", "Started"),
        ("submitted", "Submitted"),
        ("abandoned", "Abandoned"),
    )

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="sessions")
    assignment = models.ForeignKey(GameAssignment, on_delete=models.SET_NULL, related_name="sessions", null=True, blank=True)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_sessions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="started")
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)


class GameAttempt(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="attempts")
    assignment = models.ForeignKey(GameAssignment, on_delete=models.SET_NULL, related_name="attempts", null=True, blank=True)
    session = models.ForeignKey(GameSession, on_delete=models.SET_NULL, related_name="attempts", null=True, blank=True)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_attempts")
    attempt_number = models.IntegerField(default=1)
    score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    max_score = models.DecimalField(max_digits=7, decimal_places=2, default=100)
    accuracy = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    streak = models.IntegerField(default=0)
    payload = models.JSONField(default=dict, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-submitted_at",)


class GameScore(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="scores")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_scores")
    best_score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    average_score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    attempts_count = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("game", "student")


class GameLeaderboard(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="leaderboard_entries")
    assignment = models.ForeignKey(GameAssignment, on_delete=models.SET_NULL, related_name="leaderboard_entries", null=True, blank=True)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_leaderboards")
    score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    rank = models.IntegerField(default=0)
    scope = models.CharField(max_length=20, default="global")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("game", "assignment", "student", "scope")


class GameBadge(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="badges")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_badges")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=30, default="Award")
    awarded_at = models.DateTimeField(auto_now_add=True)

