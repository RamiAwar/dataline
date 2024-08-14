# -------------------------------
# FRONTEND BUILD STAGE
# Build frontend build export dist folder 
# -------------------------------

FROM node:21-alpine AS temp-frontend
# Need python for node-gyp in building
RUN apk --update --no-cache add \
    libc6-compat \
    automake \
    libtool \
    autoconf \
    build-base \
    zlib \
    zlib-dev \
    python3 make gcc g++

WORKDIR /home/dataline/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copy in frontend source
COPY frontend/ .

# Temporary setup - need local env as the 'production' build is landing page only
ARG API_URL="http://localhost:7377"

ENV VITE_API_URL=$API_URL
ENV NODE_ENV=local
RUN npm run build
# -------------------------------


# -------------------------------
# BASE-BUILD IMAGE WITH BACKEND
# Build backend dependencies and install them
# -------------------------------
FROM python:3.11.6-slim-bookworm AS temp-backend

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
RUN apt-get clean && apt update --fix-missing && \
    apt upgrade -y && \
    apt-get install git libpq-dev build-essential -y

# Copy in poetry files only - this allows us to cache the layer if no new dependencies were added and install base deps
COPY backend/pyproject.toml backend/poetry.lock ./
RUN poetry config virtualenvs.in-project true && poetry install --only main --no-root


# -------------------------------
# BASE BUILD
# -------------------------------
FROM python:3.11.6-slim-bookworm AS base

WORKDIR /home/dataline

# Install postgres connector dependencies
RUN apt update && apt install --no-install-recommends libpq5 -y

# Move it to venv not .venv so supervisord does not cry
COPY --from=temp-backend /home/dataline/backend/.venv /home/dataline/backend/venv
ENV PATH="/home/dataline/backend/venv/bin:$PATH"

# Copy in backend files
WORKDIR /home/dataline/backend
COPY backend/*.py .
COPY backend/samples ./samples
COPY backend/dataline ./dataline
COPY backend/alembic ./alembic
COPY backend/templates ./templates
COPY backend/alembic.ini .

WORKDIR /home/dataline

RUN mkdir -p /home/.dataline

# Supervisord will forward the env vars to the subprocess envs
ENV SQLITE_PATH="/home/.dataline/db.sqlite3"
ENV DATA_DIRECTORY="/home/.dataline/data"

# -------------------------------
# SPA BUILD WITH MINIMAL DEPS
# -------------------------------
FROM base AS spa

WORKDIR /home/dataline/backend

# Copy in frontend build so we can serve it from FastAPI
COPY --from=temp-frontend /home/dataline/frontend/dist /home/dataline/frontend/dist
RUN \
    cp -r /home/dataline/frontend/dist/assets /home/dataline/backend && \
    cp /home/dataline/frontend/dist/favicon.ico /home/dataline/backend/assets && \
    cp /home/dataline/frontend/dist/.vite/manifest.json /home/dataline/backend/assets

# This stage is meant to be used as an SPA server with FastAPI serving a React build
ENV SPA_MODE=1
ARG AUTH_USERNAME
ENV AUTH_USERNAME=$AUTH_USERNAME
ARG AUTH_PASSWORD
ENV AUTH_PASSWORD=$AUTH_PASSWORD
ARG ALLOWED_ORIGINS
ENV ALLOWED_ORIGINS=$ALLOWED_ORIGINS

# Running alembic and uvicorn without combining them in a bash -c command won't work
CMD ["bash", "-c", "python -m dataline.main"]

