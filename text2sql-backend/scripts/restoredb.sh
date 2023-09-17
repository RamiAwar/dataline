#!/bin/sh

pg_restore -U ${POSTGRES_USER} -d ${POSTGRES_DB} /tmp/${BACKUP_NAME}
