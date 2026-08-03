#!/bin/bash
# Run from repo root after: cd web && npx vercel login
# Links to cyber-security project and pushes Supabase env vars.
set -euo pipefail

cd "$(dirname "$0")/../web"

PROJECT="${VERCEL_PROJECT:-cyber-security-ruddy}"
SCOPE="${VERCEL_SCOPE:-}"

SCOPE_FLAG=""
if [ -n "$SCOPE" ]; then
  SCOPE_FLAG="--scope $SCOPE"
fi

echo "Linking Vercel project: $PROJECT"
npx vercel link --project "$PROJECT" --yes $SCOPE_FLAG

add_env() {
  local name="$1"
  local value="$2"
  echo "Setting $name..."
  printf '%s' "$value" | npx vercel env add "$name" production $SCOPE_FLAG --force 2>/dev/null || \
    printf '%s' "$value" | npx vercel env add "$name" production $SCOPE_FLAG
}

DB_URL='postgresql://postgres.fwxdfogdzfrznnjozwbx:Lums463463%23%23%23ahmad@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1'
DIRECT='postgresql://postgres:Lums463463%23%23%23ahmad@db.fwxdfogdzfrznnjozwbx.supabase.co:5432/postgres?sslmode=require'
AUTH_SECRET='AJHtPiLUS1gjwMSwj/tVQOp9y5pMp+bK2u+oQyFh/3s='
APP_URL='https://cyber-security-ruddy.vercel.app'

add_env DATABASE_URL "$DB_URL"
add_env DIRECT_URL "$DIRECT"
add_env NEXT_PUBLIC_SUPABASE_URL 'https://fwxdfogdzfrznnjozwbx.supabase.co'
add_env NEXT_PUBLIC_SUPABASE_ANON_KEY 'sb_publishable_FZHD1TdlT0yctH8C_9m3tg_E3meUkPT'
add_env AUTH_SECRET "$AUTH_SECRET"
add_env AUTH_URL "$APP_URL"
add_env NEXT_PUBLIC_APP_URL "$APP_URL"
add_env APP_URL "$APP_URL"
add_env SETUP_SECRET 'qs-setup-355bcd6'

echo ""
echo "Done! Redeploy: npx vercel --prod $SCOPE_FLAG"
echo "Then test: curl $APP_URL/api/health"
