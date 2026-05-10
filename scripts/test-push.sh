#!/usr/bin/env bash
#
# test-push.sh — Diagnostic script to test Expo push notifications
#
# Usage:
#   ./scripts/test-push.sh
#   ./scripts/test-push.sh "ExponentPushToken[your-token-here]"
#
# If no token is provided, it will fetch all tokens from Supabase.

set -euo pipefail

# Load env from mobile app
MOBILE_ENV="$(dirname "$0")/../apps/mobile/.env.local"
if [ -f "$MOBILE_ENV" ]; then
  # shellcheck disable=SC1090
  source <(grep -E '^EXPO_PUBLIC_' "$MOBILE_ENV" | sed 's/EXPO_PUBLIC_//')
fi

SUPABASE_URL="${SUPABASE_URL:-https://vsjyngzffwdhqgjuoady.supabase.co}"

echo "=== Expo Push Notification Diagnostics ==="
echo ""

# ----- Step 1: Get token(s) -----
if [ -n "${1:-}" ]; then
  TOKENS=("$1")
  echo "📱 Using provided token: ${TOKENS[0]:0:30}..."
else
  echo "📱 Fetching push tokens from Supabase..."
  RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/push_subscriptions?select=token,platform,user_id" \
    -H "apikey: ${SUPABASE_ANON_KEY:-}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY:-}")
  
  echo "   Raw response: $RESPONSE"
  echo ""
  
  # Parse tokens
  TOKENS=()
  while IFS= read -r token; do
    [ -n "$token" ] && TOKENS+=("$token")
  done < <(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for row in data:
    print(row.get('token', ''))
" 2>/dev/null || echo "")
  
  if [ ${#TOKENS[@]} -eq 0 ]; then
    echo "❌ No push tokens found. Make sure:"
    echo "   1. You've opened the app on a physical device"
    echo "   2. You've granted notification permissions"
    echo "   3. The SUPABASE_ANON_KEY is set (or pass a token directly)"
    exit 1
  fi
  
  echo "   Found ${#TOKENS[@]} token(s)"
fi

echo ""

# ----- Step 2: Send test push via Expo API -----
for TOKEN in "${TOKENS[@]}"; do
  echo "🚀 Sending test push to: ${TOKEN:0:35}..."
  
  PAYLOAD=$(cat <<EOF
{
  "to": "$TOKEN",
  "sound": "default",
  "title": "🧪 Diagnostic Test",
  "body": "If you see this, push notifications are working!",
  "data": { "type": "diagnostic" }
}
EOF
)
  
  RESULT=$(curl -s -X POST "https://exp.host/--/api/v2/push/send" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$PAYLOAD")
  
  echo "   Response: $RESULT"
  echo ""
  
  # Parse result
  STATUS=$(echo "$RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'data' in data:
    ticket = data['data']
    if isinstance(ticket, list):
        ticket = ticket[0]
    status = ticket.get('status', 'unknown')
    print(status)
    if status == 'error':
        details = ticket.get('details', {})
        msg = ticket.get('message', 'No message')
        error = details.get('error', 'Unknown')
        print(f'  Error: {error}')
        print(f'  Message: {msg}')
elif 'errors' in data:
    for err in data['errors']:
        print(f'  API Error: {err.get(\"message\", \"Unknown\")}')
" 2>/dev/null || echo "parse_failed")

  if echo "$STATUS" | grep -q "^ok"; then
    echo "   ✅ Ticket accepted! Notification should arrive shortly."
  elif echo "$STATUS" | grep -q "InvalidCredentials"; then
    echo "   ❌ InvalidCredentials — FCM Service Account key is NOT uploaded to Expo."
    echo "      Fix: Go to expo.dev → Credentials → Android → Add FCM V1 service account key"
  elif echo "$STATUS" | grep -q "DeviceNotRegistered"; then
    echo "   ⚠️  Device not registered — this token is stale. Remove it from DB."
  else
    echo "   ⚠️  Status: $STATUS"
  fi
  echo ""
done

echo "=== Done ==="
