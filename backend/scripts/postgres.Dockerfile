FROM postgres:latest

# Variables used by postgres image - defining user, password and database name
ENV POSTGRES_DB="dvdrental"
ENV POSTGRES_USER="postgres"
ENV POSTGRES_PASSWORD="dvdrental"

# We need first download archive with DVD Rental backup and then extract it
ENV ARCHIVE_NAME="dvdrental.zip"
ENV BACKUP_NAME="dvdrental.tar"
ENV URL="https://www.postgresqltutorial.com/wp-content/uploads/2019/05/${ARCHIVE_NAME}"

RUN apt-get update && apt-get install -y wget unzip

RUN wget -nv "${URL}" -O "/tmp/${ARCHIVE_NAME}" \
  && unzip -q "/tmp/${ARCHIVE_NAME}" -d /tmp

# All SQL and SH files from docker-entrypoint-initdb.d will be run after creation of postgres container
# Script restoredb.sh restores (pg_restore) DVD Rental database
COPY restoredb.sh /docker-entrypoint-initdb.d/
