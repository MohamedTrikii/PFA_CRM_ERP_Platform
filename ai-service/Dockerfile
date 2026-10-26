FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
COPY requirements.docker.txt .
# Prefer a lightweight docker-specific requirements file when present to avoid
# building heavy ML dependencies during development. If not present, fall back
# to the full `requirements.txt`.
RUN pip install --no-cache-dir --timeout 300 --retries 5 \
        $([ -f requirements.docker.txt ] && [ -s requirements.docker.txt ] && echo "-r requirements.docker.txt" || echo "-r requirements.txt")

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
