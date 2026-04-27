from rest_framework import serializers

from core.serializers import CourseSerializer, UserSerializer
from .models import ForumCategory, Post, Reaction, Report, Thread, ThreadSubscription


class ForumCategorySerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    course_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ForumCategory
        fields = "__all__"


class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    reaction_count = serializers.IntegerField(source="reactions.count", read_only=True)

    class Meta:
        model = Post
        fields = "__all__"

    def get_replies(self, obj):
        replies = obj.replies.filter(is_hidden=False)
        return PostSerializer(replies, many=True, context=self.context).data


class ThreadSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    category = ForumCategorySerializer(read_only=True)
    course_id = serializers.IntegerField(write_only=True)
    category_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    posts = serializers.SerializerMethodField()
    is_subscribed = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = "__all__"

    def get_posts(self, obj):
        root_posts = obj.posts.filter(parent__isnull=True, is_hidden=False)
        return PostSerializer(root_posts, many=True, context=self.context).data

    def get_is_subscribed(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        if not user or not user.is_authenticated:
            return False
        return obj.subscriptions.filter(user=user).exists()


class ReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reaction
        fields = "__all__"


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = "__all__"


class ThreadSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThreadSubscription
        fields = "__all__"

