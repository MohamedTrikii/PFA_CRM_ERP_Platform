FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
COPY requirements.docker.txt .
# Prefer a lightweight docker-specific requirements file when present to avoid
# building heavy ML dependencies during development. If not present, fall back
# to the full `requirements.txt`.
RUN if [ -f requirements.docker.txt ] && [ -s requirements.docker.txt ]; then \
			pip install --no-cache-dir -r requirements.docker.txt ; \
		else \
			pip install --no-cache-dir -r requirements.txt ; \
		fi

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
