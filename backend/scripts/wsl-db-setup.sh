#!/usr/bin/env bash
# Provision the local StarFeeds Postgres inside WSL2 (Ubuntu).
# Run as root:  wsl -d Ubuntu-22.04 -u root -- bash /mnt/.../wsl-db-setup.sh
set -euo pipefail

DB_USER=starfeeds
DB_PASS=starfeeds
DB_NAME=starfeeds

# Start the cluster (idempotent).
pg_ctlcluster 14 main start || true
sleep 2

# Create role if missing.
su postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'\"" | grep -q 1 \
  || su postgres -c "psql -c \"CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';\""

# Create database if missing.
su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\"" | grep -q 1 \
  || su postgres -c "psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\""

echo '--- roles ---'
su postgres -c "psql -tAc \"SELECT rolname FROM pg_roles WHERE rolname='${DB_USER}'\""
echo '--- databases ---'
su postgres -c "psql -tAc \"SELECT datname FROM pg_database WHERE datname='${DB_NAME}'\""
echo 'OK'
