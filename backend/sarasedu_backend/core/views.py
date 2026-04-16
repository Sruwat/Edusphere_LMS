import base64
import logging
import os
import socket
import time
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.files.storage import default_storage
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import F
from django.http import HttpResponse, HttpResponseForbidden, StreamingHttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Assignment, AssignmentSubmission, Lecture, LibraryDownload, LibraryItem
from .serializers import (
    AssignmentSubmissionSerializer,
    LectureSerializer,
    LibraryItemSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .throttles import AIChatRateThrottle

User = get_user_model()
logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        user = User.objects.get(id=response.data['id'])
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'token': str(refresh.access_token),
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)

    serializer = UserSerializer(
        request.user,
        data=request.data,
        partial=request.method == 'PATCH',
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Return token pair and user details on login."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK and 'access' in response.data:
            username = request.data.get('username') or request.data.get('email')
            user = User.objects.filter(username=username).first()
            if user:
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
                response.data['user'] = UserSerializer(user).data
        return response


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        from .serializers import PasswordResetRequestSerializer

        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({'detail': 'If that email exists, a reset link was sent.'})

        token = PasswordResetTokenGenerator().make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        frontend = os.environ.get('FRONTEND_RESET_URL') or os.environ.get('FRONTEND_URL') or 'http://localhost:5000'
        reset_link = f"{frontend.rstrip('/')}/auth/reset-password?uid={uid}&token={token}"

        try:
            send_mail(
                'Password reset for SarasEdu',
                f'Use the following link to reset your password: {reset_link}\nIf you did not request this, ignore.',
                os.environ.get('EMAIL_FROM', 'noreply@sarasedu.local'),
                [email],
                fail_silently=False,
            )
        except Exception:
            logger.exception('Password reset email delivery failed for user_id=%s', user.pk)

        return Response({'detail': 'If that email exists, a reset link was sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        from .serializers import PasswordResetConfirmSerializer

        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except Exception:
            return Response({'detail': 'Invalid uid'}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password has been reset.'})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .serializers import ChangePasswordSerializer

        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'detail': 'Invalid current password.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Password has been changed successfully.'})


class AIChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIChatRateThrottle]

    def post(self, request, *args, **kwargs):
        message = request.data.get('message')
        if not message:
            return Response({'detail': 'message required'}, status=status.HTTP_400_BAD_REQUEST)

        openrouter_key = os.environ.get('OPENROUTER_API_KEY')
        if not openrouter_key:
            return Response({'detail': 'AI service is not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        payload = {
            'model': os.environ.get('AI_MODEL', 'gpt-4o-mini'),
            'messages': [{'role': 'user', 'content': message}],
            'temperature': float(os.environ.get('AI_TEMPERATURE', '0.2')),
            'max_tokens': int(os.environ.get('AI_MAX_TOKENS', '800')),
        }

        try:
            response = requests.post(
                f"{os.environ.get('OPENROUTER_API_URL', 'https://openrouter.ai/api').rstrip('/')}/v1/chat/completions",
                headers={
                    'Authorization': f'Bearer {openrouter_key}',
                    'Content-Type': 'application/json',
                },
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            content = ((data.get('choices') or [{}])[0].get('message') or {}).get('content')
            if not content:
                logger.warning('OpenRouter returned empty content for user_id=%s', request.user.pk)
                return Response({'detail': 'AI service returned an empty response.'}, status=status.HTTP_502_BAD_GATEWAY)
            return Response({'content': content})
        except Exception:
            logger.exception('OpenRouter request failed for user_id=%s', request.user.pk)
            return Response({'detail': 'AI service request failed.'}, status=status.HTTP_502_BAD_GATEWAY)


class AIHealthView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        openrouter_key = os.environ.get('OPENROUTER_API_KEY')
        openrouter_base = os.environ.get('OPENROUTER_API_URL', 'https://openrouter.ai/api').rstrip('/')
        parsed = urlparse(openrouter_base)
        host = parsed.netloc or parsed.path
        result = {'openrouter_key_present': bool(openrouter_key), 'openrouter_base': openrouter_base}

        try:
            result['dns'] = {'host': host, 'ip': socket.gethostbyname(host)}
        except Exception as exc:
            result['dns_error'] = str(exc)

        if not openrouter_key:
            return Response(result, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            response = requests.get(
                f'{openrouter_base}/v1/models',
                headers={'Authorization': f'Bearer {openrouter_key}'},
                timeout=10,
            )
            result['http_status'] = response.status_code
            result['http_response'] = response.json() if 'application/json' in response.headers.get('Content-Type', '') else response.text
            return Response(result, status=status.HTTP_200_OK if response.ok else status.HTTP_502_BAD_GATEWAY)
        except Exception as exc:
            result['http_error'] = str(exc)
            return Response(result, status=status.HTTP_502_BAD_GATEWAY)


class CourseLecturesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, id, *args, **kwargs):
        lectures = Lecture.objects.filter(course_id=id).order_by('order_index')
        return Response(LectureSerializer(lectures, many=True).data)


class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all().order_by('id')


class UserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id, *args, **kwargs):
        try:
            user = User.objects.get(id=id)
        except User.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(user).data)


class LibraryListCreateView(generics.ListCreateAPIView):
    queryset = LibraryItem.objects.all().order_by('-upload_date')
    serializer_class = LibraryItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and getattr(user, 'role', None) == 'teacher':
            return qs.filter(uploaded_by=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class LibraryDetailView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_object(self, id):
        try:
            return LibraryItem.objects.get(id=id)
        except LibraryItem.DoesNotExist:
            return None

    def get(self, request, id, *args, **kwargs):
        obj = self.get_object(id)
        if not obj:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(LibraryItemSerializer(obj).data)

    def put(self, request, id, *args, **kwargs):
        obj = self.get_object(id)
        if not obj:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if getattr(request.user, 'role', None) != 'admin' and obj.uploaded_by != request.user:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        serializer = LibraryItemSerializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, id, *args, **kwargs):
        obj = self.get_object(id)
        if not obj:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if getattr(request.user, 'role', None) != 'admin' and obj.uploaded_by != request.user:
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssignmentSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id, *args, **kwargs):
        try:
            assignment = Assignment.objects.get(id=id)
        except Assignment.DoesNotExist:
            return Response({'detail': 'assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if getattr(request.user, 'role', None) != 'student':
            return Response({'detail': 'Only students may submit assignments.'}, status=status.HTTP_403_FORBIDDEN)

        submitted_file_url = None
        file = request.FILES.get('file')
        if file:
            path = default_storage.save(file.name, file)
            submitted_file_url = default_storage.url(path)

        submission = AssignmentSubmission.objects.create(
            assignment=assignment,
            student=request.user,
            submitted_file_url=submitted_file_url,
            submission_text=request.data.get('submission_text', ''),
            status='submitted',
        )
        return Response(AssignmentSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class DriveProxyView(APIView):
    permission_classes = []

    def get(self, request, *args, **kwargs):
        url = request.query_params.get('url')
        if not url:
            return HttpResponse(status=status.HTTP_400_BAD_REQUEST)

        try:
            host = (urlparse(url).netloc or '').lower()
        except Exception:
            return HttpResponse(status=status.HTTP_400_BAD_REQUEST)

        allowed_hosts = ('drive.google.com', 'docs.google.com', 'lh3.googleusercontent.com')
        if not any(h in host for h in allowed_hosts):
            return HttpResponseForbidden('Host not allowed')

        headers = {}
        incoming_range = request.META.get('HTTP_RANGE')
        if incoming_range:
            headers['Range'] = incoming_range

        try:
            upstream = requests.get(url, headers=headers, stream=True, allow_redirects=True, timeout=15)
        except requests.RequestException:
            logger.exception('Drive proxy upstream request failed for url=%s', url)
            return HttpResponse(status=status.HTTP_502_BAD_GATEWAY)

        def stream_gen():
            try:
                for chunk in upstream.iter_content(chunk_size=8192):
                    if chunk:
                        yield chunk
            finally:
                upstream.close()

        response = StreamingHttpResponse(
            stream_gen(),
            status=upstream.status_code,
            content_type=upstream.headers.get('Content-Type', 'application/octet-stream'),
        )
        if upstream.headers.get('Content-Length'):
            response['Content-Length'] = upstream.headers['Content-Length']
        if upstream.headers.get('Content-Range'):
            response['Content-Range'] = upstream.headers['Content-Range']
        response['Accept-Ranges'] = 'bytes'
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Expose-Headers'] = 'Content-Length,Content-Range'
        return response


class LibraryDownloadView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, id, *args, **kwargs):
        try:
            item = LibraryItem.objects.get(id=id)
        except LibraryItem.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.user and request.user.is_authenticated:
            try:
                LibraryDownload.objects.create(user=request.user, library_item=item)
            except Exception:
                logger.exception('Failed to create library download audit record for item_id=%s', item.pk)

        try:
            with transaction.atomic():
                LibraryItem.objects.filter(id=item.id).update(total_downloads=F('total_downloads') + 1)
                item.refresh_from_db()
        except Exception:
            logger.exception('Failed to increment download count for item_id=%s', item.pk)
            return Response({'detail': 'Unable to record download right now.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'total_downloads': item.total_downloads})


class AIImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.FILES.get('file'):
            image_bytes = request.FILES['file'].read()
        else:
            img_data = request.data.get('image') or request.data.get('imageData')
            if not img_data:
                return Response({'detail': 'image required (file upload or base64 image)'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                if isinstance(img_data, str) and img_data.startswith('data:'):
                    _, img_data = img_data.split(',', 1)
                image_bytes = base64.b64decode(img_data)
            except Exception:
                return Response({'detail': 'invalid image payload'}, status=status.HTTP_400_BAD_REQUEST)

        openrouter_key = os.environ.get('OPENROUTER_API_KEY')
        if not openrouter_key:
            return Response({'detail': 'AI service is not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            img_b64 = base64.b64encode(image_bytes).decode('utf-8')
            img_type = 'jpeg'
            if image_bytes.startswith(b'\x89PNG'):
                img_type = 'png'
            elif image_bytes.startswith(b'GIF'):
                img_type = 'gif'

            response = requests.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {openrouter_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': 'openai/gpt-4o-mini',
                    'messages': [{
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': 'Describe this image in one sentence.'},
                            {'type': 'image_url', 'image_url': {'url': f'data:image/{img_type};base64,{img_b64}'}},
                        ],
                    }],
                    'max_tokens': 150,
                },
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
            description = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            if not description:
                return Response({'detail': 'AI service returned an empty response.'}, status=status.HTTP_502_BAD_GATEWAY)
            return Response({'description': description})
        except Exception:
            logger.exception('AI image analysis failed for user_id=%s', request.user.pk)
            return Response({'detail': 'Image analysis failed.'}, status=status.HTTP_502_BAD_GATEWAY)


class AITranscribeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'file required'}, status=status.HTTP_400_BAD_REQUEST)

        assembly_key = os.environ.get('ASSEMBLY_API_KEY')
        if not assembly_key:
            return Response({'detail': 'Transcription service is not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        headers = {'Authorization': assembly_key}

        try:
            upload_resp = requests.post('https://api.assemblyai.com/v2/upload', headers=headers, data=file.read(), timeout=60)
            upload_resp.raise_for_status()
            audio_url = upload_resp.json().get('upload_url') or upload_resp.json().get('url')
            if not audio_url:
                raise ValueError('Missing upload URL')

            create_resp = requests.post(
                'https://api.assemblyai.com/v2/transcript',
                headers=headers,
                json={'audio_url': audio_url},
                timeout=30,
            )
            create_resp.raise_for_status()
            transcript_id = create_resp.json().get('id')
            if not transcript_id:
                raise ValueError('Missing transcript id')

            poll_url = f'https://api.assemblyai.com/v2/transcript/{transcript_id}'
            for _ in range(60):
                poll_resp = requests.get(poll_url, headers=headers, timeout=30)
                poll_resp.raise_for_status()
                poll_data = poll_resp.json()
                if poll_data.get('status') == 'completed':
                    return Response({'text': poll_data.get('text', '')})
                if poll_data.get('status') == 'failed':
                    logger.error('AssemblyAI transcription failed for user_id=%s transcript_id=%s', request.user.pk, transcript_id)
                    return Response({'detail': 'Transcription failed.'}, status=status.HTTP_502_BAD_GATEWAY)
                time.sleep(2)
        except Exception:
            logger.exception('AssemblyAI transcription request failed for user_id=%s', request.user.pk)
            return Response({'detail': 'Transcription request failed.'}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({'detail': 'Transcription timed out'}, status=status.HTTP_504_GATEWAY_TIMEOUT)
