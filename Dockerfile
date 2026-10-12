# Backend image: Django API served by gunicorn.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# install packages first so this layer is cached between code changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY manage.py ./
COPY skillgap_project ./skillgap_project
COPY catalog ./catalog

# admin CSS/JS, served by whitenoise (the key here is only for this build step)
RUN DJANGO_SECRET_KEY=build-only python manage.py collectstatic --noinput

# run as a normal user, not root
RUN useradd --create-home app && mkdir -p /app/media && chown -R app /app/media
USER app

EXPOSE 8000
# apply any new database migrations, then start the web server
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn skillgap_project.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 60 --access-logfile -"]
