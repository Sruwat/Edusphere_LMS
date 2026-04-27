from django.conf import settings
from django.db import models


class ForumCategory(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True, null=True)
    course = models.ForeignKey("core.Course", on_delete=models.CASCADE, related_name="forum_categories", null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class Thread(models.Model):
    STATUS_CHOICES = (
        ("open", "Open"),
        ("resolved", "Resolved"),
        ("hidden", "Hidden"),
    )

    course = models.ForeignKey("core.Course", on_delete=models.CASCADE, related_name="forum_threads")
    category = models.ForeignKey(ForumCategory, on_delete=models.SET_NULL, related_name="threads", null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="forum_threads")
    title = models.CharField(max_length=255)
    body = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    reply_count = models.IntegerField(default=0)
    last_post_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-is_pinned", "-last_post_at", "-created_at")

    def __str__(self):
        return self.title


class Post(models.Model):
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name="posts")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="forum_posts")
    body = models.TextField()
    parent = models.ForeignKey("self", on_delete=models.CASCADE, related_name="replies", null=True, blank=True)
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at",)


class Reaction(models.Model):
    REACTION_CHOICES = (
        ("like", "Like"),
        ("helpful", "Helpful"),
        ("insightful", "Insightful"),
    )

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="forum_reactions")
    reaction_type = models.CharField(max_length=20, choices=REACTION_CHOICES, default="like")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("post", "user", "reaction_type")


class Report(models.Model):
    STATUS_CHOICES = (
        ("open", "Open"),
        ("reviewed", "Reviewed"),
        ("dismissed", "Dismissed"),
    )

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="forum_reports")
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    created_at = models.DateTimeField(auto_now_add=True)


class ThreadSubscription(models.Model):
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name="subscriptions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="forum_subscriptions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("thread", "user")

