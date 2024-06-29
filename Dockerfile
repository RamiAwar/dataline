# -------------------------------
# FRONTEND BUILD STAGE
# Build frontend build export dist folder 
# -------------------------------

FROM node:21-alpine as temp-frontend
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
ENV NODE_ENV=local

ARG RAILWAY_PUBLIC_DOMAIN="http://localhost:7377"
ENV VITE_API_URL=$RAILWAY_PUBLIC_DOMAIN
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
COPY backend/pyproject.toml backend/poetry.lock ./
RUN poetry config virtualenvs.in-project true && poetry install --only main --no-root


# -------------------------------
# BASE BUILD
# -------------------------------
FROM python:3.11.6-slim-bookworm as base

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
COPY backend/alembic.ini .

WORKDIR /home/dataline

RUN mkdir -p /home/.dataline

# Supervisord will forward the env vars to the subprocess envs
ENV SQLITE_PATH="/home/.dataline/db.sqlite3"
ENV DATA_DIRECTORY="/home/.dataline/data"

# -------------------------------
# DEV BUILD WITH MINIMAL DEPS
# -------------------------------
FROM base as dev

WORKDIR /home/dataline/backend

# Running alembic and uvicorn without combining them in a bash -c command won't work
CMD ["bash", "-c", "python -m alembic upgrade head && python -m uvicorn dataline.main:app --port=7377 --host=0.0.0.0 --reload"]


# -------------------------------
# PROD BUILD WITH MINIMAL DEPS
# -------------------------------
# FROM python:3.11.8-alpine as prod
FROM base as prod

# Setup supervisor and caddy
WORKDIR /home/dataline

# Install supervisor to manage be/fe processes
RUN pip install --no-cache-dir supervisor

# Install Caddy server
# RUN apk update && apk add caddy
RUN apt update && apt install caddy -y


# Copy in supervisor config, frontend build, backend source
COPY supervisord.conf .
COPY --from=temp-frontend /home/dataline/frontend/dist /home/dataline/frontend/dist
COPY frontend/Caddyfile /home/dataline/frontend/Caddyfile


CMD ["supervisord", "-n"]
