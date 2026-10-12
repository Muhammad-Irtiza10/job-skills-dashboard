# Running CareerPath Analyzer with Docker

## What's in the box

| Container | What it is | Built from |
|---|---|---|
| `frontend` | The React site, served by **nginx**. nginx also forwards `/api`, `/media`, `/admin` and `/static` to the backend, so the whole app lives at **one address**. | `frontend/Dockerfile` |
| `backend` | The Django API, run by **gunicorn**. On every start it applies any new database migrations. | `Dockerfile` |
| `db` | PostgreSQL 18, **local use only** (Azure gets a managed database). | official `postgres` image |

`docker-compose.yml` starts all three together. Data is kept in two Docker volumes, so it survives restarts:
`pgdata` (database) and `media` (profile photos).

Secrets (email and JSearch keys) are read from your `.env` file and never baked into the images.

## Everyday commands (run in the project folder)

```powershell
docker compose up --build -d     # build and start everything in the background
docker compose ps                # what's running
docker compose logs -f backend   # watch the backend's log (Ctrl+C to stop watching)
docker compose down              # stop everything (data is kept)
```

Then open **http://localhost:8081**. (Port 8081, so it doesn't clash with `npm run dev` on 8080.)

## First run: copy your current local data in

The Docker database starts empty. To copy in everything from your normal local database
(`skillgap_local`: accounts, majors, sorted skills, live jobs):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost -Fc skillgap_local -f local-data.backup
docker compose cp local-data.backup db:/tmp/local-data.backup
docker compose exec db pg_restore -U skillgap -d skillgap --no-owner --no-privileges --clean --if-exists /tmp/local-data.backup
docker compose cp media/. backend:/app/media      # profile photos, if you have any
```

`*.backup` files are ignored by git (they contain user accounts).

## Running commands inside the backend

```powershell
docker compose exec backend python manage.py fetch_jsearch_jobs   # refresh live jobs
docker compose exec backend python manage.py createsuperuser      # admin login for /admin
docker compose exec backend python manage.py test catalog.tests   # run the tests
```

## Start completely fresh

```powershell
docker compose down -v    # -v also deletes the database and photo volumes
```

## Settings the containers use

Set in `docker-compose.yml` for local use; on Azure they become app settings / secrets.

| Variable | Meaning |
|---|---|
| `DJANGO_DEBUG` | `false` in containers (no debug pages) |
| `DJANGO_SECRET_KEY` | long random string; **must** be secret in production |
| `DJANGO_ALLOWED_HOSTS` | the site addresses Django accepts |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | the site's full address, e.g. `https://app.example.com` |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE` | database connection (`DB_SSLMODE=require` on Azure) |
| `FRONTEND_URL` | used in password-reset email links |
| `EMAIL_*`, `DEFAULT_FROM_EMAIL` | Mailjet settings (from `.env`) |
| `JSEARCH_API_KEY` | live jobs (from `.env`) |
| `MEDIA_ROOT`, `SERVE_MEDIA` | where profile photos are stored / whether Django serves them |
