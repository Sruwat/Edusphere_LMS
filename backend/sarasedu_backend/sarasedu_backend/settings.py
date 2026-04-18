import os
import sys
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / '.env')

BASE_DIR = Path(__file__).resolve().parents[2]

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'unsafe-dev-secret-change-me-32chars')

DEBUG = os.environ.get('DEBUG', '0') == '1'

if not DEBUG and SECRET_KEY == 'unsafe-dev-secret-change-me-32chars':
    raise RuntimeError('DJANGO_SECRET_KEY must be set when DEBUG=0')

ALLOWED_HOSTS = [
    host.strip() for host in os.environ.get(
        'ALLOWED_HOSTS',
        'localhost,127.0.0.1'
    ).split(',') if host.strip()
]
CSRF_TRUSTED_ORIGINS = [
    origin.strip() for origin in os.environ.get(
        'CSRF_TRUSTED_ORIGINS',
        'http://localhost:5000,http://127.0.0.1:5000,http://localhost:8000,http://127.0.0.1:8000'
    ).split(',') if origin.strip()
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'storages',
    'django_filters',
    'core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'sarasedu_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'sarasedu_backend.wsgi.application'

USE_SQLITE_FOR_TESTS = os.environ.get('USE_SQLITE_FOR_TESTS', '1') == '1' and 'test' in sys.argv

if USE_SQLITE_FOR_TESTS:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'test.sqlite3',
        }
    }
else:
    db_options = {'init_command': "SET sql_mode='STRICT_TRANS_TABLES'"}
    db_ssl_ca = os.environ.get('DB_SSL_CA')
    if db_ssl_ca:
        db_options['ssl'] = {'ca': db_ssl_ca}

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.environ.get('DB_NAME', 'sarasedu'),
            'USER': os.environ.get('DB_USER', 'sarasedu'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'password'),
            'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DB_PORT', '3306'),
            'OPTIONS': db_options,
        }
    }

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'core.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '2000/day',
        'ai_chat': '30/minute'
    }
}

TEST_RUNNER = 'sarasedu_backend.test_runner.DefaultAppDiscoverRunner'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
}

# JWT and auth settings
SIMPLE_JWT.update({
    'AUTH_HEADER_TYPES': ('Bearer',),
    'ROTATE_REFRESH_TOKENS': False,
})

CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in os.environ.get(
        'CORS_ALLOWED_ORIGIN',
        'http://localhost:5000,http://127.0.0.1:5000'
    ).split(',') if origin.strip()
]
if DEBUG:
    # During development allow the common local origins
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOW_CREDENTIALS = True

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = 'same-origin'
    X_FRAME_OPTIONS = 'DENY'

# File storage (local by default). Set USE_S3=1 to enable S3/MinIO via django-storages.
USE_S3 = os.environ.get('USE_S3', '0') == '1'
if USE_S3:
    DEFAULT_FILE_STORAGE = 'core.storage_backends.PublicS3MediaStorage'
    AWS_ACCESS_KEY_ID = os.environ.get('MINIO_ACCESS_KEY') or os.environ.get('MINIO_ACCESS_KEY')
    AWS_SECRET_ACCESS_KEY = os.environ.get('MINIO_SECRET_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('MINIO_BUCKET', 'sarasedu')
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    # Endpoint used by the storage client (internal container DNS). For local dev
    # you may want to expose a public endpoint (e.g. http://localhost:9000) via
    # MINIO_PUBLIC_ENDPOINT to make generated file URLs accessible from host.
    storage_endpoint = os.environ.get('STORAGE_ENDPOINT_URL')
    if storage_endpoint:
        internal_endpoint = storage_endpoint
    else:
        raw_endpoint = os.environ.get('MINIO_ENDPOINT', 'minio:9000')
        if raw_endpoint.startswith('http://') or raw_endpoint.startswith('https://'):
            internal_endpoint = raw_endpoint
        else:
            internal_endpoint = ('https://' if os.environ.get('MINIO_SECURE', '0') == '1' else 'http://') + raw_endpoint
    # Use the internal endpoint for the S3 client so the container can reach MinIO.
    AWS_S3_ENDPOINT_URL = internal_endpoint
    # Expose a public endpoint separately (used by front-end / URL generation) if provided.
    PUBLIC_MEDIA_BASE_URL = os.environ.get('STORAGE_PUBLIC_BASE_URL') or os.environ.get('MINIO_PUBLIC_ENDPOINT') or None
    AWS_S3_REGION_NAME = os.environ.get('MINIO_REGION', '')
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_S3_VERIFY = os.environ.get('MINIO_SECURE', '0') == '1'
else:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    MEDIA_PUBLIC_URL = os.environ.get('MEDIA_PUBLIC_URL', MEDIA_URL)

    # Email settings: default to console backend in development, allow SMTP via env in prod
    EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
    EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '25'))
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', '0') == '1'
    EMAIL_FROM_ADDRESS = os.environ.get('EMAIL_FROM', 'noreply@sarasedu.local')

# Upload validation defaults
MAX_UPLOAD_MB = int(os.environ.get('MAX_UPLOAD_MB', '20'))
# Allowed upload MIME types (do not include application/octet-stream in production)
ALLOWED_UPLOAD_MIME_TYPES = os.environ.get('ALLOWED_UPLOAD_MIME_TYPES', 'application/pdf,image/png,image/jpeg,video/mp4,application/zip').split(',')

LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': LOG_LEVEL,
    },
    'loggers': {
        'core': {
            'handlers': ['console'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
    },
}
