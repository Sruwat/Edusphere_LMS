# Edusphere LMS API Guide

## Overview

Edusphere LMS exposes REST APIs through Django REST Framework. The backend uses:

- JWT authentication
- role-based permissions
- DRF viewsets for most resource APIs
- APIViews for specialized workflows such as auth, AI services, and operational endpoints

## Local API Docs

When the backend is running locally:

- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- ReDoc: `http://127.0.0.1:8000/api/redoc/`
- OpenAPI schema: `http://127.0.0.1:8000/api/schema/`

## Authentication Flow

### Login

- endpoint: `/api/auth/login`
- supports:
  - `username + password`
  - `email + password`

### Tokens

- access token for authenticated requests
- refresh token for renewal flow

### Current User

- endpoint: `/api/auth/me`
- returns the authenticated user profile

### Register

- endpoint: `/api/auth/register`

## Major API Areas

### Auth And Users

- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/me`
- `/api/auth/refresh`
- `/api/users`

### Courses And Enrollment

- `/api/courses/`
- `/api/enrollments/`
- `/api/lectures/`
- `/api/lecture-materials/`
- `/api/study-materials/`

### Assignments And Assessments

- `/api/assignments/`
- `/api/assignment-submissions/`
- `/api/tests/`
- `/api/questions/`
- `/api/test-submissions/`
- `/api/test-answers/`

### Attendance

- `/api/attendance/`

### Library And Media

- `/api/library`
- `/api/uploads/`

### Live Classes And Events

- `/api/live-classes/`
- `/api/events/`

### Announcements And Notifications

- `/api/announcements/`
- `/api/notifications/`

### Forum

- `/api/forum/categories/`
- `/api/forum/threads/`
- `/api/forum/posts/`
- `/api/forum/reports/`

Thread actions include:

- subscribe
- unsubscribe
- lock
- pin
- resolve
- hide
- summary

### Games

- `/api/games/`
- `/api/games/{slug}/`
- `/api/games/{slug}/start/`
- `/api/games/{slug}/submit/`
- `/api/games/{slug}/leaderboard/`
- `/api/game-assignments/`
- `/api/game-badges/`

### AI Services

The backend also includes AI-oriented APIViews and service endpoints used for tutor workflows, media-assisted prompts, and related operations.

## Request Pattern

Typical frontend flow:

1. user logs in
2. frontend stores JWT access and refresh tokens
3. API service layer sends authenticated requests
4. backend checks JWT and role permissions
5. response returns JSON payloads for React Query or direct UI consumption

## Frontend API Integration Notes

The frontend centralizes transport through `frontend/src/services/api.js`.

Important integration characteristics:

- automatic token attachment
- refresh-token retry flow
- support for JSON and `FormData`
- backend availability status handling
- React Query hooks layered on top of the API client

## Upload And Media Notes

- course and library thumbnails support uploaded files
- legacy URL-based thumbnail compatibility still exists
- uploads can use local storage by default
- object storage can be enabled through environment configuration

## Security Notes

- JWT-based authentication
- role-based access control
- environment-driven CORS and CSRF trusted origins
- throttling configured in DRF settings

## Testing And Validation

Backend validation commands:

```powershell
cd backend
$env:DJANGO_SECRET_KEY="your-secret-key"
.\.venv\Scripts\python.exe .\sarasedu_backend\manage.py check
.\.venv\Scripts\python.exe .\sarasedu_backend\manage.py test
```

Swagger is the best source of truth for exact request and response shapes in local development.
