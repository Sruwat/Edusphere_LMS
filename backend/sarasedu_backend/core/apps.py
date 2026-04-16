from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    def ready(self):
        # import signal handlers
        try:
            from . import signals  # noqa: F401
        except Exception:
            # avoid crashing app import if signals fail in some environments
            pass
