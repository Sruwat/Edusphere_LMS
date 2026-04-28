# Edusphere LMS Architecture

## Overview

Edusphere LMS is a modular monolithic learning platform built with:

- React + Vite on the frontend
- Django + Django REST Framework on the backend
- MySQL as the primary persistence layer
- local or object-based storage for uploaded media
- AI and communication integrations through backend service endpoints

The system is designed around role-based workflows for students, teachers, and administrators.

## Complete System Architecture

```mermaid
flowchart TB
    subgraph Users["Users / Actors"]
        STU[Student]
        TCH[Teacher]
        ADM[Admin]
    end

    subgraph Client["Client Layer"]
        WEB[React + Vite Web App]
        AUTHCTX[Auth Context]
        DASH[Role-Based Dashboard]
        FEAT[Feature Modules<br/>Courses<br/>Assignments<br/>Tests<br/>AI Tutor<br/>Games<br/>Library<br/>Attendance<br/>Live Classes<br/>Announcements<br/>Analytics<br/>Profile<br/>Settings]
        APICLIENT[Central API Client]
    end

    subgraph API["Backend API Layer"]
        DJ[Django Application]
        ROUTES[REST API Routes]
        JWT[JWT Auth + Refresh]
        PERM[Role Permissions]
        VSET[DRF ViewSets]
        AVIEW[APIView Services]
    end

    subgraph Domain["Business / Domain Layer"]
        USERDOM[User & Role Management]
        COURSE[Course Management]
        ENROLL[Enrollment]
        LECT[Lectures & Study Materials]
        ASSIGN[Assignments & Submissions]
        TEST[Test / Quiz Engine]
        ATTN[Attendance]
        LIB[Digital Library]
        LIVE[Live Classes & Events]
        ANN[Announcements & Notifications]
        PROF[Profiles & User Settings]
        ANALYTICS[Analytics / Activity Logs / Alerts]
        AITUTOR[AI Tutor Logic]
    end

    subgraph Data["Persistence Layer"]
        DB[(MySQL Database)]
        MEDIA[File Storage<br/>Local / S3 / MinIO]
    end

    subgraph External["External Integrations"]
        OR[OpenRouter / LLM]
        IMG[Image Analysis]
        ASR[Audio Transcription]
        MAIL[Email / Notification Delivery]
        SMS[SMS Channel]
    end

    STU --> WEB
    TCH --> WEB
    ADM --> WEB

    WEB --> AUTHCTX
    WEB --> DASH
    DASH --> FEAT
    FEAT --> APICLIENT

    APICLIENT --> DJ
    DJ --> ROUTES
    ROUTES --> JWT
    ROUTES --> PERM
    ROUTES --> VSET
    ROUTES --> AVIEW

    VSET --> USERDOM
    VSET --> COURSE
    VSET --> ENROLL
    VSET --> LECT
    VSET --> ASSIGN
    VSET --> TEST
    VSET --> ATTN
    VSET --> LIB
    VSET --> LIVE
    VSET --> ANN
    VSET --> PROF
    VSET --> ANALYTICS

    AVIEW --> AITUTOR
    AVIEW --> USERDOM
    AVIEW --> ANN

    USERDOM --> DB
    COURSE --> DB
    ENROLL --> DB
    LECT --> DB
    ASSIGN --> DB
    TEST --> DB
    ATTN --> DB
    LIB --> DB
    LIVE --> DB
    ANN --> DB
    PROF --> DB
    ANALYTICS --> DB
    AITUTOR --> DB

    LECT --> MEDIA
    ASSIGN --> MEDIA
    LIB --> MEDIA
    LIVE --> MEDIA

    AITUTOR --> OR
    AITUTOR --> IMG
    AITUTOR --> ASR
    ANN --> MAIL
    ANN --> SMS
```

## System Flow

```mermaid
flowchart LR
    A[User logs in] --> B[JWT issued]
    B --> C[Frontend stores access/refresh token]
    C --> D[User opens dashboard]
    D --> E[Frontend calls API]
    E --> F[Backend checks JWT + role]
    F --> G[Business module executes]
    G --> H[(MySQL / Storage)]
    H --> I[JSON response]
    I --> J[Frontend renders feature UI]
```

## Student Use Case

```mermaid
flowchart TD
    S[Student] --> A[Login / Register]
    A --> B[Open Student Dashboard]

    B --> C[Browse Courses]
    C --> D[Enroll in Course]
    D --> E[View Lectures]
    E --> F[Access Study Materials]

    B --> G[Use AI Tutor]
    G --> G1[Ask Question by Text]
    G --> G2[Upload Image]
    G --> G3[Voice Input / Transcription]
    G --> G4[Generate Quiz]
    G --> G5[Generate Summary]
    G --> G6[Create Notes]
    G --> G7[Learning Path Help]

    B --> H[Play Learning Games]

    B --> I[Open Tests / Quizzes]
    I --> I1[Start Test]
    I1 --> I2[Answer Questions]
    I2 --> I3[Submit Test]
    I3 --> I4[View Result / Score]

    B --> J[Open Assignments]
    J --> J1[Read Instructions]
    J1 --> J2[Upload File / Text]
    J2 --> J3[Submit Assignment]
    J3 --> J4[Receive Grade / Feedback]

    B --> K[Join Live Classes]
    K --> K1[View Schedule]
    K1 --> K2[Open Meeting Link]

    B --> L[Open Digital Library]
    L --> L1[Search Resources]
    L1 --> L2[Download / Use Content]

    B --> M[View Attendance]
    B --> N[Receive Notifications / Announcements]
    B --> O[Rate Course]
    B --> P[Manage Profile / Settings]
```

## Teacher Use Case

```mermaid
flowchart TD
    T[Teacher] --> A[Login]
    A --> B[Open Teacher Dashboard]

    B --> C[Create Course]
    C --> C1[Edit Course Details]
    C1 --> C2[Publish Course]

    B --> D[Manage Lectures]
    D --> D1[Add Lecture]
    D1 --> D2[Upload Video / Content]
    D2 --> D3[Attach Lecture Materials]

    B --> E[Manage Study Materials]
    E --> E1[Upload PDFs / Notes / Resources]

    B --> F[Manage Assignments]
    F --> F1[Create Assignment]
    F1 --> F2[Set Deadline / Marks]
    F2 --> F3[Review Student Submissions]
    F3 --> F4[Grade and Feedback]

    B --> G[Manage Tests / Quizzes]
    G --> G1[Create Test]
    G1 --> G2[Add Questions]
    G2 --> G3[Schedule Test]
    G3 --> G4[Review Submissions / Scores]

    B --> H[Manage Live Classes]
    H --> H1[Schedule Session]
    H1 --> H2[Add Meeting Link]
    H2 --> H3[Conduct Class]

    B --> I[Mark Attendance]
    I --> I1[Present / Absent / Late]

    B --> J[Post Announcements]
    J --> J1[Send In-App / Email / SMS]

    B --> K[Track Student Progress]
    K --> K1[View Enrollments]
    K --> K2[View Performance]
    K --> K3[View Engagement]

    B --> L[Moderate Discussions]
    B --> M[Assign Games]
    B --> N[Manage Profile / Settings]
```

## Admin Use Case

```mermaid
flowchart TD
    A[Admin] --> B[Login]
    B --> C[Open Admin Dashboard]
    C --> D[Manage Users]
    C --> E[Monitor Courses]
    C --> F[View Attendance Overview]
    C --> G[View Analytics]
    C --> H[View Activity Logs]
    C --> I[View System Alerts]
    C --> J[Post Institution Announcements]
    C --> K[Platform Oversight]
```

## Core Academic Flow

```mermaid
flowchart TD
    A[Teacher Creates Course] --> B[Teacher Adds Lectures / Materials]
    B --> C[Student Browses Course]
    C --> D[Student Enrolls]
    D --> E[Student Studies Content]
    E --> F[Student Joins Live Class]
    E --> G[Student Submits Assignment]
    E --> H[Student Takes Test]
    G --> I[Teacher Reviews / Grades]
    H --> J[System Stores Results]
    I --> K[Student Gets Feedback]
    J --> K
    K --> L[Analytics / Progress Tracking]
    L --> M[Admin Monitors Platform]
```

## Backend Module Layout

- `core`
  Shared models, compatibility layer, auth views, uploads, and legacy integration points.
- `accounts`
  Route grouping for account and auth-related concerns.
- `courses`
  Course and enrollment route grouping.
- `content`
  Lectures, study materials, and content route grouping.
- `assessments`
  Assignments, tests, questions, answers, and submissions.
- `communications`
  Announcements and notifications.
- `media_assets`
  Media-oriented route grouping.
- `ai`
  AI tutor and related service endpoints.
- `forum`
  Categories, threads, posts, subscriptions, moderation, and reports.
- `games`
  Catalog, sessions, attempts, assignments, badges, and leaderboards.

## Database ERD

This ERD focuses on the major academic, discussion, and gamification relationships present in the current system.

```mermaid
erDiagram
    USER ||--o| STUDENT_PROFILE : has
    USER ||--o| TEACHER_PROFILE : has
    USER ||--o| ADMIN_PROFILE : has

    USER ||--o{ COURSE : teaches
    COURSE ||--o{ LECTURE : contains
    LECTURE ||--o{ LECTURE_MATERIAL : has
    COURSE ||--o{ STUDY_MATERIAL : has

    USER ||--o{ ENROLLMENT : owns
    COURSE ||--o{ ENROLLMENT : receives

    USER ||--o{ LECTURE_PROGRESS : tracks
    LECTURE ||--o{ LECTURE_PROGRESS : updates

    COURSE ||--o{ ASSIGNMENT : contains
    ASSIGNMENT ||--o{ ASSIGNMENT_ATTACHMENT : has
    ASSIGNMENT ||--o{ ASSIGNMENT_SUBMISSION : receives
    USER ||--o{ ASSIGNMENT_SUBMISSION : submits

    COURSE ||--o{ TEST : contains
    TEST ||--o{ QUESTION : has
    TEST ||--o{ TEST_SUBMISSION : receives
    USER ||--o{ TEST_SUBMISSION : submits
    TEST_SUBMISSION ||--o{ TEST_ANSWER : includes
    QUESTION ||--o{ TEST_ANSWER : answers

    COURSE ||--o{ ATTENDANCE_RECORD : records
    USER ||--o{ ATTENDANCE_RECORD : has

    COURSE o|--o{ LIBRARY_ITEM : references
    USER ||--o{ LIBRARY_ITEM : uploads
    USER ||--o{ LIBRARY_FAVORITE : bookmarks
    LIBRARY_ITEM ||--o{ LIBRARY_FAVORITE : saved
    USER ||--o{ LIBRARY_DOWNLOAD : downloads
    LIBRARY_ITEM ||--o{ LIBRARY_DOWNLOAD : tracked

    COURSE o|--o{ EVENT : schedules
    COURSE o|--o{ LIVE_CLASS : hosts
    USER o|--o{ LIVE_CLASS : instructs

    COURSE ||--o{ FORUM_CATEGORY : groups
    COURSE ||--o{ THREAD : contains
    FORUM_CATEGORY o|--o{ THREAD : classifies
    USER ||--o{ THREAD : creates
    THREAD ||--o{ POST : contains
    USER ||--o{ POST : writes
    POST ||--o{ REACTION : receives
    USER ||--o{ REACTION : leaves
    POST ||--o{ REPORT : reported_in
    USER ||--o{ REPORT : files
    THREAD ||--o{ THREAD_SUBSCRIPTION : followed_by
    USER ||--o{ THREAD_SUBSCRIPTION : subscribes

    GAME ||--o{ GAME_ASSIGNMENT : assigned_as
    COURSE ||--o{ GAME_ASSIGNMENT : includes
    USER o|--o{ GAME_ASSIGNMENT : creates
    GAME ||--o{ GAME_SESSION : starts
    USER ||--o{ GAME_SESSION : plays
    GAME_ASSIGNMENT o|--o{ GAME_SESSION : contextualizes
    GAME ||--o{ GAME_ATTEMPT : records
    USER ||--o{ GAME_ATTEMPT : makes
    GAME_ASSIGNMENT o|--o{ GAME_ATTEMPT : scopes
    GAME_SESSION o|--o{ GAME_ATTEMPT : contains
    GAME ||--o{ GAME_SCORE : summarizes
    USER ||--o{ GAME_SCORE : owns
    GAME ||--o{ GAME_LEADERBOARD : ranks
    USER ||--o{ GAME_LEADERBOARD : appears_on
    GAME_ASSIGNMENT o|--o{ GAME_LEADERBOARD : contextualizes
    GAME ||--o{ GAME_BADGE : awards
    USER ||--o{ GAME_BADGE : earns
```

## Architecture Notes

- The project uses a modular monolith rather than microservices.
- The frontend is being migrated toward feature-based organization with React Query and Zustand.
- `core` still retains part of the original domain ownership for compatibility and safe migration.
- forum and games are implemented as dedicated modules instead of placeholder UI sections.
