from urllib.parse import quote

from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class PublicS3MediaStorage(S3Boto3Storage):
    """Return predictable public URLs for S3-compatible stores like Supabase."""

    file_overwrite = False

    def url(self, name, parameters=None, expire=None, http_method=None):
        public_base = getattr(settings, 'PUBLIC_MEDIA_BASE_URL', None)
        if public_base:
            cleaned_name = quote(str(name).lstrip('/'))
            return f"{public_base.rstrip('/')}/{cleaned_name}"
        return super().url(name, parameters=parameters, expire=expire, http_method=http_method)
