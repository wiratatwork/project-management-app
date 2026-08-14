#!/bin/sh
set -e

echo "==============================================="
echo "Project Management backend entrypoint"
echo "==============================================="

echo "-> Applying database migrations (prisma migrate deploy)"
npx prisma migrate deploy

echo "-> Seeding demo data"
node prisma/seed.js

echo "-> Starting API server"
exec node src/server.js
