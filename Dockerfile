# -------------------------------
# FRONTEND BUILD STAGE
# Build frontend build export dist folder 
# -------------------------------

FROM node:21-alpine as temp-frontend
# Need python for node-gyp in building
RUN apk add --no-cache python3 make gcc g++
WORKDIR /home/dataline/frontend
COPY text2sql-frontend/package.json text2sql-frontend/package-lock.json ./
RUN npm install

# Copy in frontend source
COPY text2sql-frontend/ .

# Temporary setup - need local env as the 'production' build is landing page only
ENV NODE_ENV=local
RUN npm run build
# -------------------------------


# -------------------------------
# BASE-BUILD IMAGE WITH BACKEND
# Build backend dependencies and install them
# ------------------------------
FROM python:3.11.6-slim-bookworm as temp-backend

# Set working directory
WORKDIR /home/dataline/backend

# Setup for poetry
ENV PATH="/home/dataline/.poetry/bin:${PATH}" \
    POETRY_HOME="/home/dataline/.poetry"

# Don't buffer `stdout`:
ENV PYTHONUNBUFFERED=1
# Don't create `.pyc` files:
ENV PYTHONDONTWRITEBYTECODE=1

RUN pip install --no-cache-dir poetry

# Install build dependencies, install dependencies, remove build dependencies
RUN apt update && \
    apt upgrade -y && \
    apt-get install git libpq-dev build-essential -y

# Copy in poetry files only - this allows us to cache the layer if no new dependencies were added and install base deps
COPY text2sql-backend/pyproject.toml text2sql-backend/poetry.lock ./
RUN poetry config virtualenvs.in-project true && poetry install --only main --no-root

# -------------------------------
# PROD BUILD WITH MINIMAL DEPS
# -------------------------------
# FROM python:3.11.8-alpine as prod
FROM python:3.11.6-slim-bookworm as prod

# Setup supervisor and caddy
WORKDIR /home/dataline

# Install supervisor to manage be/fe processes
RUN pip install --no-cache-dir supervisor

# Install Caddy server
# RUN apk update && apk add caddy
RUN apt update && apt install caddy -y

# ------------------------------
# Last stage - Copy frontend build and backend source and run
FROM prod as runner

RUN apt-get update && apt-get -y install --no-install-recommends libpq5

# Copy in supervisor config, frontend build, backend source
COPY supervisord.conf .
COPY --from=temp-frontend /home/dataline/frontend/dist /home/dataline/frontend/dist
# Move it to venv not .venv so supervisord does not cry
COPY --from=temp-backend /home/dataline/backend/.venv /home/dataline/backend/venv
ENV PATH="/home/dataline/backend/venv/bin:$PATH"

# Copy in backend files
WORKDIR /home/dataline/backend
COPY text2sql-backend/*.py .
COPY text2sql-backend/dataline ./dataline
COPY text2sql-backend/alembic ./alembic
COPY text2sql-backend/alembic.ini .

WORKDIR /home/dataline
RUN mkdir -p backend/dataline/configuration
CMD ["supervisord", "-n"]
