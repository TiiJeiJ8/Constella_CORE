#!/usr/bin/env bash
set -euo pipefail

# Simple wrapper for golang-migrate CLI
# Usage: ./scripts/migrate.sh up "postgres://user:pass@host:5432/dbname?sslmode=disable"

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <up|down|force> <DATABASE_URL> [version]"
  exit 2
fi

CMD=$1
DBURL=$2
ARG3=${3:-}

case "$CMD" in
  up)
    migrate -path ./migrations -database "$DBURL" up
    ;;
  down)
    migrate -path ./migrations -database "$DBURL" down
    ;;
  force)
    if [ -z "$ARG3" ]; then
      echo "force requires version argument"
      exit 2
    fi
    migrate -path ./migrations -database "$DBURL" force "$ARG3"
    ;;
  *)
    echo "unknown command: $CMD"
    exit 2
    ;;
esac
