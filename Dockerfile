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
ARG API_URL="/"

# Used for railway builds
ARG SERVICE_ID="1"

ENV VITE_API_URL=$API_URL
ENV NODE_ENV=local
RUN npm run build
# -------------------------------


# -------------------------------
# BASE BUILD
# -------------------------------
FROM python:3.11-slim AS base

WORKDIR /home/dataline/backend

# set env variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install postgres connector dependencies
RUN apt update && apt install --no-install-recommends libpq5 -y

RUN mkdir -p /home/dataline/backend

# Temporarily use uv command from remote image to install dependencies
# https://docs.astral.sh/uv/guides/integration/docker/#non-editable-installs
# Mount the lock and pyproject.toml to speed up image build time if these files are not changed
# Cache ID follows railway structure
# https://docs.railway.com/guides/dockerfiles#cache-mounts
RUN --mount=from=ghcr.io/astral-sh/uv,source=/uv,target=/bin/uv \
    --mount=type=cache,id=id=s/${SERVICE_ID}-root/.cache/uv,target=/root/.cache/uv \
    --mount=type=bind,source=backend/uv.lock,target=uv.lock \
    --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
    uv sync --no-dev --frozen --no-install-project


ENV PATH="/home/dataline/backend/.venv/bin:$PATH"

# Copy in backend files
COPY backend/*.py .
COPY backend/samples ./samples
COPY backend/dataline ./dataline
COPY backend/alembic ./alembic
COPY backend/templates ./templates
COPY backend/alembic.ini .

WORKDIR /home/dataline

RUN mkdir -p /home/.dataline

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

