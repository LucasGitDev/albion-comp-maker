#!/bin/sh
set -e
mkdir -p "$(dirname "${DATABASE_PATH:-/app/data/app.db}")"
mkdir -p "${UPLOADS_DIR:-/app/data/uploads/backgrounds}"
node_modules/.bin/drizzle-kit migrate
exec node server.js
