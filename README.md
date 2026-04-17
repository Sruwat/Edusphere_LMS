# Edusphere LMS

Edusphere LMS is an all-in-one academic operating system built for schools, colleges, coaching institutes, academies, and modern training teams. It brings course delivery, live learning, testing, assignments, communication, student support, and AI-assisted experiences into one connected platform.

Instead of forcing institutions to manage classes in one tool, tests in another, resources in another, and communication somewhere else, Edusphere keeps the learning journey in one place. Students can enroll, attend live classes, take tests, submit work, access the digital library, and get AI-powered help. Teachers and admins can manage operations, track academic progress, and run the institution from a unified dashboard.

## What Edusphere Solves

Edusphere LMS helps institutions:

- launch structured digital learning programs
- centralize courses, tests, assignments, attendance, and communication
- improve student engagement with interactive and AI-assisted support
- simplify teacher workflows for delivery, evaluation, and classroom management
- give admins visibility into performance, activity, and operations

## Core Product Experience

### Multi-role platform

Edusphere includes dedicated experiences for students, teachers, and admins. Each role gets the controls, dashboards, and workflows needed for real academic use, making the platform feel operational rather than purely demonstrational.

### Course creation and enrollment

Teachers can create and publish courses, manage lectures, upload study materials, and structure the academic journey end to end. Students can explore courses, enroll, and track their learning progress from one interface.

### AI Tutor

The AI Tutor gives students an on-demand academic companion for clarification, guided learning, instant explanations, and support during self-study or revision. It is designed as a value-added feature that makes the LMS feel more responsive and personalized.

### AI-enhanced digital library

The digital library is more than a file repository. It acts as a learning resource hub where students and teachers can organize, discover, access, and manage academic content in a more intelligent way.

### Live classes

Teachers can schedule and manage live sessions directly inside the platform. Students can view upcoming classes and join from the same academic environment where they access courses and assignments, keeping live learning integrated instead of fragmented.

### Live tests and assessments

Edusphere supports quizzes, tests, question management, submissions, and results tracking. This allows institutions to conduct continuous evaluation inside the LMS instead of depending on disconnected assessment tools.

### Assignments and submissions

Teachers can create assignments with deadlines, instructions, file attachments, and grading workflows. Students can submit work digitally, while staff can review progress and maintain academic accountability.

### Attendance, notifications, and analytics

The platform includes attendance tracking, announcements, notifications, profile management, settings, and analytics-oriented modules that support operational visibility and day-to-day academic management.

## Feature Highlights

- Student, Teacher, and Admin dashboards
- Course creation, publishing, and enrollment management
- Lecture management and study materials
- AI Tutor workflows
- AI-enhanced digital library
- Live classes with join links and scheduling
- Live tests, quizzes, and submission flows
- Assignment creation, upload, and review
- Attendance management
- Announcements and notifications
- User profiles, settings, and role-linked records
- Course ratings and academic activity tracking
- Django REST API with MySQL persistence

## Technology Stack

- Frontend: React + Vite
- Backend: Django + Django REST Framework
- Database: MySQL
- Authentication: JWT
- File support: local storage or S3/MinIO-style object storage

## Fresh Clone Setup

### 1. Clone the repository

```powershell
git clone https://github.com/Sruwat/Edusphere_LMS.git
cd Edusphere_LMS
```

### 2. Prepare MySQL

Create a MySQL database named `sarasedu`. Then create an application user and grant access to that database.

Example SQL:

```sql
CREATE DATABASE IF NOT EXISTS sarasedu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'sarasedu'@'localhost' IDENTIFIED BY 'your-app-password';
ALTER USER 'sarasedu'@'localhost' IDENTIFIED BY 'your-app-password';
GRANT ALL PRIVILEGES ON sarasedu.* TO 'sarasedu'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure the backend environment

```powershell
cd backend
Copy-Item .env.example .env
```

Open `backend/.env` and update the MySQL values so they match your local server:

- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

For local development, the frontend usually runs on `http://localhost:5000`, so keep `CORS_ALLOWED_ORIGIN` aligned with that.

### 4. Create the Python virtual environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 5. Install backend dependencies

```powershell
pip install -r requirements.txt
```

### 6. Run migrations

```powershell
.\.venv\Scripts\python.exe sarasedu_backend\manage.py migrate
```

### 7. Seed demo accounts and sample data

```powershell
.\.venv\Scripts\python.exe sarasedu_backend\manage.py seed_db
```

### 8. Start the backend

```powershell
.\.venv\Scripts\python.exe sarasedu_backend\manage.py runserver 8001
```

### 9. Install frontend dependencies

```powershell
cd ..\frontend
npm install
```

### 10. Start the frontend

```powershell
npm run dev
```

## Local Development URLs

- Frontend: `http://127.0.0.1:5000`
- Backend status: `http://127.0.0.1:8001/`
- Backend API: `http://127.0.0.1:8001/api/`

## Demo Credentials

After running `seed_db`, these demo accounts are available:

- Admin: `admin@sarasedu.com` / `adminpass`
- Teacher: `sarah.johnson@sarasedu.com` / `teacherpass`
- Teacher: `michael.chen@sarasedu.com` / `teacherpass`
- Student: `john.doe@student.com` / `studentpass`
- Student: `jane.smith@student.com` / `studentpass`

Note: the frontend login accepts email, and the app automatically maps that email to the correct username for JWT login.

## Version 1 Release Notes

Version `1.0.0` establishes the first complete Edusphere LMS release with:

- a multi-role academic dashboard experience
- course, lecture, and enrollment workflows
- AI Tutor and AI-assisted library concepts
- live classes, tests, and assignments
- attendance, notifications, analytics, and profile management
- a React frontend backed by Django REST APIs and MySQL

## License

This project is available under the MIT License. See [`LICENSE`](LICENSE) for details.
