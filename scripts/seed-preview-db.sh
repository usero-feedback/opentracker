#!/bin/bash
# Seed preview database with bootstrap data
set -e

if [ -z "$DB_NAME" ]; then
  echo "❌ Error: DB_NAME environment variable is required"
  exit 1
fi

echo "🌱 Seeding preview database: $DB_NAME"

# Generate type-safe SQL from TypeScript
echo "Generating seed SQL..."
npx tsx scripts/seed-preview-db.ts

# Execute the generated SQL on the remote D1 database
echo "Executing seed SQL on remote database..."
npx wrangler d1 execute "$DB_NAME" --remote --file=scripts/seed-preview.sql

echo "✅ Preview database seeded successfully!"
