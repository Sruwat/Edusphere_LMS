# SarasEdu LMS

## Structure

- `backend/`: Django + DRF API
- `frontend/`: React + Vite app

## Local Demo

1. Backend
```powershell
cd backend
Copy-Item .env.example .env
.\.venv\Scripts\python.exe sarasedu_backend\manage.py migrate
.\.venv\Scripts\python.exe sarasedu_backend\manage.py runserver 127.0.0.1:8000
```

2. Frontend
```powershell
cd frontend
npm run dev
```

3. URLs
- Frontend: `http://127.0.0.1:5000`
- Backend API: `http://127.0.0.1:8000/api`

## Production Environment Files

- Backend: copy `backend/.env.production.example` to `backend/.env`
- Frontend: copy `frontend/.env.production.example` to `frontend/.env.production`

## Production Notes

- Keep `DEBUG=0`
- Set explicit `ALLOWED_HOSTS`
- Keep `VITE_API_BASE_URL=/api` when the frontend is reverse-proxied to the backend
- If files are served through MinIO/S3, set `MINIO_PUBLIC_ENDPOINT` to a browser-reachable URL

## Verification

- Backend tests:
```powershell
cd backend
.\.venv\Scripts\python.exe sarasedu_backend\manage.py test
```

- Frontend smoke + build:
```powershell
cd frontend
npm test
npm run build
```
