#!/bin/bash
# Trigger the hourly cron job locally to process AI clustering

echo "🔄 Triggering hourly cron job (AI batching/clustering)..."
echo "📍 Make sure your dev server is running on http://localhost:8787"
echo ""

# Trigger the scheduled function
# Use separate calls for cleaner output on macOS
http_code=$(curl -s -o /tmp/cron-response.txt -w "%{http_code}" "http://localhost:8787/cdn-cgi/handler/scheduled?cron=0+*+*+*+*")
body=$(cat /tmp/cron-response.txt 2>/dev/null || echo "")

echo ""
if [ "$http_code" -eq 200 ]; then
    echo "✅ Cron triggered successfully!"
    echo ""
    echo "This will:"
    echo "  1. Find unprocessed feedback (need 10+ items or 1hr+ old)"
    echo "  2. Queue AI processing"
    echo "  3. Create clusters using Claude + OpenAI"
    echo ""
    echo "📊 Refresh your dashboard to see Pattern Detection appear!"
else
    echo "❌ Failed to trigger cron (HTTP $http_code)"
    echo "Make sure:"
    echo "  - Dev server is running (npm run dev)"
    echo "  - Server is on http://localhost:8787"
    echo ""
    if [ -n "$body" ]; then
        echo "Response:"
        echo "$body"
    fi
    echo ""
    echo "💡 If HTTP 500, check server logs for errors"
    echo "   (Missing env vars like CLAUDE_API_KEY or OPENAI_API_KEY?)"
fi
