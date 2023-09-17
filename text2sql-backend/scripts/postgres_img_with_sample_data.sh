#!/bin/bash

if [[ "$(docker images -q pg_dvdrental 2> /dev/null)" == "" ]]; then
  echo "Building docker image for postgres with sample data"
  docker build -f postgres.Dockerfile -t pg_dvdrental .
fi

echo "Running docker image for postgres with sample data"
docker run -p 5433:5432 --name dvdrental -d pg_dvdrental
