#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

echo "🧹 Resetting preview database..."

# Define the tables in the correct order for deletion.
# Dependent tables (with foreign keys) must come before the tables they reference.
# You may need to adjust this based on your exact schema.
TABLES_TO_DROP=(
  "FeedbackScreenshot"
  "FeedbackClusterMembership"
  "FeedbackInsight"
  "PullRequest"
  "NotificationHistory"
  "Feedback"
  "NotificationSettings"
  "Client"
  "User"
  "d1_migrations" # Also include the migrations table here
)

echo "Disabling foreign key constraints (as a safeguard)..."
npx wrangler d1 execute feedback-preview --remote --command "PRAGMA foreign_keys = OFF;"

# Drop all tables in the specified order
echo "Dropping all application tables..."
for table in "${TABLES_TO_DROP[@]}"; do
  echo "Dropping table: $table"
  # We use a simple `DROP TABLE` and let `set -e` handle any real errors.
  # The `IF EXISTS` clause handles the case where the table is already gone.
  npx wrangler d1 execute feedback-preview --remote --command "DROP TABLE IF EXISTS \`$table\`;"
done

# Re-enabling is good practice before applying migrations that might expect it.
echo "Re-enabling foreign key constraints..."
npx wrangler d1 execute feedback-preview --remote --command "PRAGMA foreign_keys = ON;"

# Apply fresh migrations
echo "Applying fresh migrations..."
npx wrangler d1 migrations apply feedback-preview --remote

echo "✅ Preview database reset complete!"