FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATABASE_URL=sqlite:////data/app.db

WORKDIR /app
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

COPY server/ server/
COPY dist/ dist/

# Migrations run at startup (server/main.py lifespan), so the database in the
# /data volume is always at the newest revision.
VOLUME /data
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1/api/health', timeout=2)" || exit 1

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "80", "--proxy-headers"]
