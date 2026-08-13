#!/usr/bin/env bash
#
# Runs the tenant-isolation suite against a DISPOSABLE Postgres container.
#
# Safety: this script only ever talks to a container it starts itself, on
# localhost:55432, and it drops the schema on every run. It has no way to reach a
# hosted Supabase project — there is no connection string to pass in.
#
set -euo pipefail

CONTAINER=wb-test-pg
DB=wbtest
PORT=55432
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Start Docker Desktop and try again." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "▸ starting throwaway postgres…"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_PASSWORD=test -e POSTGRES_DB="$DB" \
    -p "$PORT:5432" postgres:16-alpine >/dev/null
  for _ in $(seq 1 40); do
    docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
    sleep 1
  done
fi

run() { docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d "$DB" -q "$@"; }

echo "▸ resetting schema…"
run -c "drop schema if exists public cascade;
        drop schema if exists auth cascade;
        create schema public;" >/dev/null

echo "▸ bootstrap (test-only auth stub)…"
run -f - < "$ROOT/supabase/tests/00_bootstrap.sql" >/dev/null

echo "▸ applying schema.sql…"
run -f - < "$ROOT/supabase/schema.sql" >/dev/null

# Future incremental changes go in supabase/migrations/ and are applied after
# the base schema, in filename order.
for migration in "$ROOT"/supabase/migrations/*.sql; do
  [ -f "$migration" ] || continue
  echo "▸ applying $(basename "$migration")…"
  run -f - < "$migration" >/dev/null
done

echo "▸ running tests…"
echo
set +e
OUT=""
STATUS=0
for suite in "$ROOT"/supabase/tests/[0-9][0-9]_*.test.sql; do
  [ -f "$suite" ] || continue
  PART=$(docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d "$DB" \
    -q -f - < "$suite" 2>&1)
  [ $? -ne 0 ] && STATUS=1
  OUT="$OUT$PART"$'\n'
done
set -e

# Keep only the assertion lines and any failure, and drop psql's row noise.
echo "$OUT" | grep -E 'PASS|FAIL|ERROR|ALL RLS TESTS PASSED' | sed 's/^psql:<stdin>:[0-9]*: NOTICE: //'

COUNT=$(echo "$OUT" | grep -c 'PASS' || true)
echo
if [ "$STATUS" -ne 0 ]; then
  echo "✗ SUITE FAILED"
  exit 1
fi
echo "✓ $COUNT assertions passed"
echo "▸ stop the container with: docker rm -f $CONTAINER"
