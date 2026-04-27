# Edusphere LMS

![Edusphere Banner](frontend/src/assets/Banner.jpeg)

![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Django](https://img.shields.io/badge/Backend-Django%20%2B%20DRF-092E20?style=for-the-badge&logo=django&logoColor=white)
![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-F97316?style=for-the-badge)
![OpenAPI](https://img.shields.io/badge/API-OpenAPI%20%2F%20Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=111)
![License](https://img.shields.io/badge/License-MIT-black?style=for-the-badge)

Edusphere LMS is a full-stack, role-based academic management system built for schools, colleges, coaching institutes, academies, and training programs. It brings course management, assessments, attendance, live classes, digital library workflows, AI-assisted learning, forums, games, analytics, and institution-wide communication into one platform.

## Why This Project Stands Out

Most academic systems stop at CRUD-style course management. Edusphere is designed more like an academic operating system:

- multi-role dashboards for students, teachers, and admins
- structured course, lecture, assignment, and test workflows
- AI tutor support for guided learning
- library, discussion, notification, and live-class flows in one product
- gamified engagement through an integrated games module
- modular backend architecture with documented APIs

## Product Snapshot

### Users

- Students
- Teachers
- Admins

### Main Modules

- Authentication and role-based access
- Courses, lectures, study materials, and enrollment
- Assignments, submissions, grading, and feedback
- Tests, quizzes, answers, and results
- Attendance tracking
- Digital library and media uploads
- Live classes and events
- Announcements and notifications
- AI tutor workflows
- Discussion forum
- Educational games, leaderboards, and assignments
- Analytics, activity logs, and settings

## Architecture At A Glance

```mermaid
flowchart TB
    STU[Student] --> WEB[React + Vite App]
    TCH[Teacher] --> WEB
    ADM[Admin] --> WEB

    WEB --> API[API Service Layer]
    API --> DJ[Django + DRF Backend]
    DJ --> AUTH[JWT + Role Permissions]
    DJ --> DOMAIN[Academic / AI / Forum / Games Domains]
    DOMAIN --> DB[(MySQL)]
    DOMAIN --> MEDIA[Local / S3 / MinIO Storage]
    DOMAIN --> EXT[AI / Email / SMS Services]
```

For the complete architecture diagrams and system design notes, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Core Use Cases

### Student

- enroll in courses
- attend lectures and live sessions
- submit assignments
- take quizzes and tests
- use AI tutor tools
- access digital library resources
- join course discussions
- play educational games

### Teacher

- create and publish courses
- manage lectures and materials
- create assignments and tests
- grade student work
- schedule live classes
- moderate discussion threads
- assign games to courses
- post announcements

### Admin

- manage users and platform oversight
- monitor analytics, alerts, and activity logs
- publish institution-wide announcements
- review system-level operational health

## Tech Stack

### Frontend

- React
- Vite
- React Router
- TanStack Query
- Zustand

### Backend

- Django
- Django REST Framework
- Simple JWT
- drf-spectacular
- django-filter

### Data And Storage

- MySQL
- SQLite for tests
- Local media storage
- Optional S3 / MinIO object storage

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md)
  Full system design, role flows, Mermaid diagrams, backend module layout, and architectural notes.
- [API.md](API.md)
  API structure, auth flow, key route groups, local docs endpoints, and backend integration notes.

## API Docs

When the backend is running locally:

- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- ReDoc: `http://127.0.0.1:8000/api/redoc/`
- Schema: `http://127.0.0.1:8000/api/schema/`

## Local Setup

### 1. Clone The Repository

```powershell
git clone https://github.com/Sruwat/Edusphere_LMS.git
cd Edusphere_LMS
```

### 2. Configure The Backend

```powershell
cd backend
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Set your environment values in `backend/.env`, especially:

- `DJANGO_SECRET_KEY`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

### 3. Run Migrations And Seed Demo Data

```powershell
.\.venv\Scripts\python.exe .\sarasedu_backend\manage.py migrate
.\.venv\Scripts\python.exe .\sarasedu_backend\manage.py seed_db
```

### 4. Start The Backend

```powershell
$env:DJANGO_SECRET_KEY="your-secret-key"
.\.venv\Scripts\python.exe .\sarasedu_backend\manage.py runserver 8000
```

### 5. Start The Frontend

```powershell
cd ..\frontend
npm install
npm run dev
```

## Demo Credentials

After `seed_db`:

- Admin: `admin@sarasedu.com` / `adminpass`
- Teacher: `sarah.johnson@sarasedu.com` / `teacherpass`
- Teacher: `michael.chen@sarasedu.com` / `teacherpass`
- Student: `john.doe@student.com` / `studentpass`
- Student: `jane.smith@student.com` / `studentpass`

Login supports both email and username.

## Quality Checks

### Backend

```powershell
cd backend
$env:DJANGO_SECRET_KEY="your-secret-key"
.\.venv\Scripts\python.exe .\sarasedu_backend\manage.py check
.\.venv\Scripts\python.exe .\sarasedu_backend\manage.py test
```

### Frontend

```powershell
cd frontend
npm test
npm run build
```

## Repository Structure

```text
Edusphere_LMS/
├── backend/
│   ├── sarasedu_backend/
│   │   ├── accounts/
│   │   ├── ai/
│   │   ├── assessments/
│   │   ├── communications/
│   │   ├── content/
│   │   ├── core/
│   │   ├── courses/
│   │   ├── forum/
│   │   ├── games/
│   │   ├── media_assets/
│   │   └── sarasedu_backend/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── features/
│   │   ├── lib/
│   │   ├── services/
│   │   └── stores/
│   └── package.json
├── ARCHITECTURE.md
├── API.md
└── README.md
```

## Notes

- The backend is evolving as a modular monolith.
- `core` still acts as a compatibility layer for parts of the existing data model.
- frontend server-state management now uses React Query, while app-level client state uses Zustand.
- forum and games are now first-class product modules.

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
