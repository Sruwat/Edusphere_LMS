# Edusphere LMS

Edusphere LMS is a modern learning management platform designed to bring teaching, learning, assessment, communication, and academic operations into one connected system.

It is built for schools, colleges, coaching centers, training academies, and digital education teams that want more than a basic course portal. Edusphere combines academic structure with smart automation, interactive learning tools, and AI-powered support so institutions can deliver a stronger student experience and a more efficient teaching workflow.

## Why Edusphere

Traditional LMS platforms often split learning across too many tools. Classes happen in one place, tests in another, files in another, and communication somewhere else. Edusphere is built to unify that experience.

With Edusphere, students can discover courses, enroll, attend live sessions, take tests, submit assignments, access learning materials, and get AI-assisted help from a single platform. Teachers and administrators can manage academic delivery, monitor participation, review progress, and run operations from one dashboard.

## Core Purpose

Edusphere LMS helps institutions:

- deliver structured digital learning at scale
- simplify course and classroom management
- improve student engagement and participation
- centralize tests, assignments, attendance, and resources
- offer AI-powered academic support and content assistance
- create a smooth experience for students, teachers, and admins

## Key Product Highlights

### Smart Multi-Role Platform

Edusphere supports separate experiences for:

- Students
- Teachers
- Admins

Each role gets relevant dashboards, workflows, and controls, making the product suitable for real institutional use rather than just demo-style course browsing.

### Course Management and Enrollment

The platform includes complete course workflows such as:

- course creation and publishing
- structured lecture management
- student enrollment tracking
- course progress monitoring
- course ratings and feedback

Students can browse and join learning experiences, while teachers can manage course delivery from creation to completion.

### AI Tutor

One of the standout features of Edusphere is the AI Tutor.

It is designed to act as an always-available academic companion that can help learners:

- ask subject-related questions
- get instant explanations
- receive study guidance
- interact through chat-based learning support
- work with image-based or media-assisted learning flows

This makes the platform more engaging and support-driven, especially for self-paced learning and revision.

### AI-Enhanced Digital Library

Edusphere includes an enhanced library experience that goes beyond simple file storage.

The digital library helps students and teachers:

- upload and organize study materials
- access books, videos, documents, and resources
- search and filter learning content
- manage downloadable academic assets
- interact with AI-assisted content workflows

This creates a central knowledge hub for the institution.

### Live Classes

Edusphere supports direct live-class management inside the platform.

Teachers can:

- schedule live classes
- attach class details and session links
- manage course-linked sessions
- update or remove sessions when needed

Students can:

- view upcoming live classes
- join sessions directly
- track scheduled academic sessions from one place

This helps replace fragmented live-teaching workflows with a more organized in-platform experience.

### Live Test and Examination System

The test engine is built for active academic evaluation.

It supports:

- test and quiz creation
- structured questions
- student test submissions
- result and progress tracking
- teacher-side management of assessments

This allows institutions to conduct routine tests, quizzes, and evaluation cycles directly inside the LMS.

### Assignment and Submission Workflow

Edusphere includes a full assignment system with:

- assignment creation
- deadlines and status tracking
- file-based submissions
- submission review flows
- teacher feedback and grading support

This ensures academic work remains organized and traceable.

### Attendance Management

Attendance is integrated into the platform so institutions can manage participation alongside academics.

The system supports:

- attendance records
- course-linked attendance tracking
- teacher/admin attendance workflows
- student visibility into attendance-related information

### Announcements and Notifications

Communication features are built into the product to keep the learning environment active and informed.

Edusphere includes:

- platform announcements
- user notifications
- activity visibility
- system alerts for admin-side awareness

This makes it easier to keep students, teachers, and administrators aligned.

### User Profiles and Settings

The platform supports profile and settings management for a more personalized and production-ready experience.

This includes:

- user profile information
- role-linked profile records
- user settings
- preferences and account updates

### Analytics and Academic Visibility

Edusphere is structured to support insight-driven education management.

The platform includes analytics-oriented modules and data models for:

- progress visibility
- test performance
- course engagement
- activity monitoring
- operational dashboards

## Feature Summary

Edusphere LMS currently includes:

- Student, Teacher, and Admin dashboards
- Course management
- Lecture and study material management
- Enrollment flows
- Assignment system
- Test and quiz system
- Attendance management
- Live classes
- Announcements
- Notifications
- User profiles and settings
- Course ratings
- Digital library
- AI Tutor
- AI-assisted academic workflows
- Backend API with Django and MySQL

## Technology Stack

- Frontend: React + Vite
- Backend: Django + Django REST Framework
- Database: MySQL
- Authentication: JWT-based auth
- Storage support: local file storage or S3/MinIO-style configuration

## Local Setup

### Backend

```powershell
cd backend
.\.venv\Scripts\python.exe sarasedu_backend\manage.py migrate
.\.venv\Scripts\python.exe sarasedu_backend\manage.py runserver 8001
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Local URLs

- Frontend: `http://127.0.0.1:5000`
- Backend API: `http://127.0.0.1:8001/api/`
- Backend status: `http://127.0.0.1:8001/`

## Production Direction

For Version 1 launch, Edusphere is positioned as an all-in-one academic operations and digital learning platform with strong practical value in:

- online course delivery
- hybrid teaching models
- digital assessments
- centralized academic resource access
- AI-supported student learning

It is especially suitable for institutions that want a platform that feels more advanced than a simple LMS and closer to a full digital education operating system.
