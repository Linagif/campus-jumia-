# Campus Market

A student-to-student marketplace for Kenyan university communities. The current MVP includes a responsive listing experience, Django REST API, JWT student accounts, campus/category data, saved listings, reports, and messaging foundations.

## Features

- Browse/search listings with category, campus, condition, and price filters
- Listing details, student seller profiles, and KSh pricing
- Student registration and JWT login/logout
- Create/update/delete listings through authenticated REST endpoints
- Listing image uploads with size and image-content validation
- Favorites, reports, conversations, and unread-message counts in the API
- Django admin for users, listings, categories, campuses, and report review
- Sample marketplace listings in the frontend when the API has no data or is offline

The M-Pesa and machine-learning ideas remain future work. The message API is implemented, but a full inbox UI is not part of this first runnable phase.

## Stack

- Frontend: React 19, Vite, React Router, Tailwind CSS, Lucide
- Backend: Python 3.14, Django 6, Django REST Framework, Simple JWT
- Database: SQLite for the quick local start; PostgreSQL supported via Docker Compose

## Project Structure

```text
campus-market/
├── backend/
│   ├── config/
│   ├── marketplace/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick Start (PowerShell)

Run these from the project root in separate terminals.

### 1. Configure the backend

```powershell
Copy-Item .env.example .env
& ".venv/Scripts/python.exe" backend/manage.py migrate
& ".venv/Scripts/python.exe" backend/manage.py seed_marketplace
& ".venv/Scripts/python.exe" backend/manage.py runserver 8000
```

The Python environment is created at `.venv`. If it does not exist yet:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Backend API: `http://127.0.0.1:8000/api/`  
Admin: `http://127.0.0.1:8000/admin/`

To create an administrator account:

```powershell
& ".venv/Scripts/python.exe" backend/manage.py createsuperuser
```

### 2. Start the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints, normally `http://localhost:5173/`.

## PostgreSQL

The default `.env.example` uses SQLite so the project can run immediately. To use PostgreSQL, set `DB_ENGINE=postgres` in `.env`, then start Docker Desktop and run:

```powershell
docker compose up -d db
& ".venv/Scripts/python.exe" backend/manage.py migrate
```

Set the `POSTGRES_*` values in `.env` before starting the database. Do not commit `.env`.

## Environment Variables

- `SECRET_KEY`: Django signing key; replace the example value outside local development
- `DEBUG`: Django debug mode
- `ALLOWED_HOSTS`: comma-separated Django hosts
- `CORS_ALLOWED_ORIGINS`: comma-separated frontend origins
- `DB_ENGINE`: `sqlite` or `postgres`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`: PostgreSQL connection settings
- `VITE_API_BASE_URL`: API base used by the React app; defaults to `http://127.0.0.1:8000/api`

## API

- `POST /api/auth/register/`, `POST /api/auth/login/`, `POST /api/auth/refresh/`, `POST /api/auth/logout/`
- `GET /api/auth/me/`
- `GET /api/universities/`, `GET /api/campuses/`, `GET /api/categories/`
- `GET|POST /api/listings/`, `GET|PUT|PATCH|DELETE /api/listings/{id}/`
- Listing query parameters: `search`, `category`, `campus`, `condition`, `status`, `listing_type`, `min_price`, `max_price`, `ordering`
- `GET|POST /api/favorites/`, `DELETE /api/favorites/{id}/`
- `POST /api/reports/`; report review is staff-only
- `GET|POST /api/conversations/`, `GET|POST /api/conversations/{id}/messages/`

Protected endpoints use `Authorization: Bearer <access-token>`. A user can only edit or delete their own listings; report review requires staff access.

## Images

Upload up to five JPG, PNG, or WebP images as repeated `images` fields using multipart form data. Files are limited to 5MB each. In development, Django serves media files from `/media/`.

## Tests

```powershell
& ".venv/Scripts/python.exe" backend/manage.py test marketplace.tests
npm --prefix frontend run build
```

## Current Scope

The first phase is intentionally focused on the core marketplace. The frontend includes home, browse, listing details, favorites, listing creation, and account screens. The API provides the data/auth foundations. Production deployment should add HTTPS, secure cookie-based token handling, rate limiting, object storage for images, and operational monitoring.
