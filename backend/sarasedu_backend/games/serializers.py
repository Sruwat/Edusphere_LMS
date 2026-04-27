from rest_framework import serializers

from core.serializers import CourseSerializer, UserSerializer
from .models import Game, GameAssignment, GameAttempt, GameBadge, GameLeaderboard, GameScore, GameSession


class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = "__all__"


class GameAssignmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    game = GameSerializer(read_only=True)
    course_id = serializers.IntegerField(write_only=True)
    game_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = GameAssignment
        fields = "__all__"


class GameSessionSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)

    class Meta:
        model = GameSession
        fields = "__all__"


class GameAttemptSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)

    class Meta:
        model = GameAttempt
        fields = "__all__"


class GameScoreSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)

    class Meta:
        model = GameScore
        fields = "__all__"


class GameLeaderboardSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)

    class Meta:
        model = GameLeaderboard
        fields = "__all__"


class GameBadgeSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)

    class Meta:
        model = GameBadge
        fields = "__all__"

