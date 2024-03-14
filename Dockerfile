# Run linter on dockerfile to make sure we are following best practices
FROM hadolint/hadolint:v1.17.5-6-gbc8bab9-alpine

# Copy the dockerfile and linter config from the context
COPY hadolint.yaml /config/
COPY Dockerfile .

# Execute the linting process
RUN echo "### Linting Dockerfile ###" && /bin/hadolint --config /config/hadolint.yaml Dockerfile



# ------------------------------
# First Stage - Build base image
FROM python:3.11.6-slim-bookworm as base
# Update packages and install security patches
RUN apt update && apt upgrade -y
# Needed for psycopg2
RUN apt-get install git libpq-dev build-essential -y

# Set working directory
WORKDIR /home/dataline/backend

# Install poetry
ENV PATH="/home/dataline/.poetry/bin:${PATH}" \
    POETRY_HOME="/home/dataline/.poetry"

RUN pip install --no-cache-dir poetry

# Copy in poetry files only - this allows us to cache the layer if no new dependencies were added and install base deps
COPY text2sql-backend/pyproject.toml text2sql-backend/poetry.lock ./
RUN poetry config virtualenvs.create false && poetry install --only main --no-root

# Second Stage - Build frontend build export dist folder 
FROM node:21-alpine as base-frontend
# Need python for node-gyp in building
RUN apk add --no-cache python3 make gcc g++
WORKDIR /home/dataline/frontend
COPY text2sql-frontend/package.json text2sql-frontend/package-lock.json ./
RUN npm install

# Copy in frontend source
COPY text2sql-frontend/*.json ./
COPY text2sql-frontend/*.ts ./
COPY text2sql-frontend/*.js ./
COPY text2sql-frontend/index.html ./
COPY text2sql-frontend/public ./public
COPY text2sql-frontend/src ./src

# Temporary setup - need local env as the 'production' build is landing page only
ENV NODE_ENV=local
RUN npm run build


# ------------------------------
# Third Stage - Build production image (excludes dev dependencies)
FROM base as prod

# Setup supervisor and caddy
WORKDIR /home/dataline

# Install supervisor to manage be/fe processes
RUN pip install --no-cache-dir supervisor

# Install Caddy server
RUN apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
RUN apt update
RUN apt install caddy


# ------------------------------
# Last stage - Copy frontend build and backend source and run
FROM prod as runner

# Copy in supervisor config, frontend build, backend source
COPY supervisord.conf .
COPY --from=base-frontend /home/dataline/frontend/dist /home/dataline/frontend/dist

# Copy in backend files
WORKDIR /home/dataline/backend
COPY text2sql-backend/*.py .
COPY text2sql-backend/dataline ./dataline
COPY text2sql-backend/alembic ./alembic

WORKDIR /home/dataline
CMD ["supervisord", "-n"]