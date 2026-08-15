#!/bin/sh
set -e

echo "==============================================="
echo "Project Management backend entrypoint"
echo "==============================================="

echo "-> Applying database migrations (prisma migrate deploy)"
npx prisma migrate deploy

# Seed behavior (SEED_ON_START):
#   SEED_ON_START=true   → always seed (idempotent; useful for demos)
#   SEED_ON_START=false  → never seed automatically
#   unset (default)      → seed only when the database is empty, so a fresh
#                          install still gets the `admin` login. An existing
#                          database is NEVER re-seeded — demo data does not
#                          come back on every container restart.
DO_SEED=0
if [ "$SEED_ON_START" = "true" ]; then
  DO_SEED=1
elif [ "$SEED_ON_START" != "false" ]; then
  SEED_USERS=$(node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.user.count().then((n) => { console.log(n); return p.\$disconnect(); }).catch((e) => { console.error('Seed check failed: ' + e.message); process.exit(1); });")
  if [ "$SEED_USERS" = "0" ]; then
    DO_SEED=1
  fi
fi

if [ "$DO_SEED" = "1" ]; then
  echo "-> Seeding demo data"
  node prisma/seed.js
else
  echo "-> Skipping seed (database already has data; set SEED_ON_START=true to force)"
fi

echo "-> Starting API server"
exec node src/server.js
