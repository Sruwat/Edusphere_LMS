from django.urls import path

from core.views import AIChatView, AIHealthView, AIImageView, AITranscribeView, DriveProxyView, HealthView

urlpatterns = [
    path("health", HealthView.as_view(), name="health"),
    path("ai/chat", AIChatView.as_view(), name="ai_chat"),
    path("ai/image", AIImageView.as_view(), name="ai_image"),
    path("ai/transcribe", AITranscribeView.as_view(), name="ai_transcribe"),
    path("ai/health", AIHealthView.as_view(), name="ai_health"),
    path("video-proxy/", DriveProxyView.as_view(), name="video_proxy"),
]
