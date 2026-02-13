#!/bin/bash
# =============================================================================
# Automated Supabase Setup for The Right Wire
# =============================================================================
# This script creates a Supabase project, runs the migration, and configures
# your .env.local file automatically.
#
# Usage:
#   1. Create a free Supabase account at https://supabase.com/dashboard
#   2. Go to https://supabase.com/dashboard/account/tokens
#   3. Click "Generate New Token", name it "the-right-wire", and copy the token
#   4. Run: bash scripts/setup-supabase.sh YOUR_ACCESS_TOKEN
#
# Or set it as an environment variable:
#   export SUPABASE_ACCESS_TOKEN=your-token-here
#   bash scripts/setup-supabase.sh
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/apps/web/.env.local"
MIGRATION_FILE="$PROJECT_DIR/supabase/migrations/001_initial_schema.sql"
PROJECT_NAME="the-right-wire"
REGION="us-east-1"
DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
CRON_SECRET="$(openssl rand -hex 32)"

echo -e "${BLUE}=== The Right Wire — Supabase Setup ===${NC}"
echo ""

# --- Get access token ---
TOKEN="${1:-${SUPABASE_ACCESS_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo -e "${RED}Error: No access token provided.${NC}"
  echo ""
  echo "To get your token:"
  echo "  1. Sign up/in at https://supabase.com/dashboard"
  echo "  2. Go to https://supabase.com/dashboard/account/tokens"
  echo "  3. Generate a new token"
  echo ""
  echo "Usage: bash scripts/setup-supabase.sh YOUR_ACCESS_TOKEN"
  exit 1
fi

export SUPABASE_ACCESS_TOKEN="$TOKEN"

echo -e "${GREEN}[1/5]${NC} Checking authentication..."
npx supabase projects list > /dev/null 2>&1 || {
  echo -e "${RED}Error: Invalid access token. Please check and try again.${NC}"
  exit 1
}
echo -e "  ${GREEN}✓${NC} Authenticated successfully"

# --- Check if project already exists ---
echo -e "${GREEN}[2/5]${NC} Creating project '${PROJECT_NAME}'..."
EXISTING=$(npx supabase projects list 2>/dev/null | grep "$PROJECT_NAME" || true)
if [ -n "$EXISTING" ]; then
  echo -e "  ${YELLOW}!${NC} Project '$PROJECT_NAME' already exists, using existing project"
  PROJECT_REF=$(echo "$EXISTING" | awk '{print $1}' | head -1)
else
  # Create the project
  CREATE_OUTPUT=$(npx supabase projects create "$PROJECT_NAME" \
    --region "$REGION" \
    --db-password "$DB_PASSWORD" \
    --org-id "" 2>&1) || {
    # If org-id is needed, list orgs and use the first one
    echo -e "  ${YELLOW}Detecting organization...${NC}"
    ORG_ID=$(npx supabase orgs list 2>/dev/null | tail -n +2 | awk '{print $1}' | head -1)
    if [ -z "$ORG_ID" ]; then
      echo -e "${RED}Error: No organization found. Please create one at https://supabase.com/dashboard${NC}"
      exit 1
    fi
    echo -e "  Using org: $ORG_ID"
    CREATE_OUTPUT=$(npx supabase projects create "$PROJECT_NAME" \
      --region "$REGION" \
      --db-password "$DB_PASSWORD" \
      --org-id "$ORG_ID" 2>&1)
  }
  echo "$CREATE_OUTPUT"
  PROJECT_REF=$(echo "$CREATE_OUTPUT" | grep -oP 'Created.*: \K[a-z]+' || true)

  if [ -z "$PROJECT_REF" ]; then
    # Try to extract from projects list
    sleep 5
    PROJECT_REF=$(npx supabase projects list 2>/dev/null | grep "$PROJECT_NAME" | awk '{print $1}' | head -1)
  fi
fi

if [ -z "$PROJECT_REF" ]; then
  echo -e "${RED}Error: Could not determine project reference ID.${NC}"
  echo "Please check your Supabase dashboard and look for the project URL."
  exit 1
fi

echo -e "  ${GREEN}✓${NC} Project ref: ${PROJECT_REF}"

# --- Wait for project to be ready ---
echo -e "${GREEN}[3/5]${NC} Waiting for project to provision (this takes ~2 minutes)..."
for i in $(seq 1 30); do
  STATUS=$(npx supabase projects list 2>/dev/null | grep "$PROJECT_REF" | awk '{print $NF}')
  if [ "$STATUS" = "ACTIVE_HEALTHY" ] || [ "$STATUS" = "ACTIVE" ]; then
    echo -e "  ${GREEN}✓${NC} Project is ready!"
    break
  fi
  echo -e "  Waiting... ($i/30) Status: $STATUS"
  sleep 10
done

# --- Get API keys ---
echo -e "${GREEN}[4/5]${NC} Fetching API credentials..."
API_KEYS=$(npx supabase projects api-keys --project-ref "$PROJECT_REF" 2>/dev/null)

ANON_KEY=$(echo "$API_KEYS" | grep "anon" | awk '{print $NF}')
SERVICE_KEY=$(echo "$API_KEYS" | grep "service_role" | awk '{print $NF}')
PROJECT_URL="https://${PROJECT_REF}.supabase.co"

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
  echo -e "${RED}Error: Could not retrieve API keys.${NC}"
  echo "Raw output: $API_KEYS"
  echo "Please get them manually from: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api"
  exit 1
fi

echo -e "  ${GREEN}✓${NC} Got API keys"

# --- Run migration via DB connection ---
echo -e "${GREEN}[5/5]${NC} Running database migration..."
# Link the project for db operations
npx supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true

# Try pushing the migration
npx supabase db push 2>/dev/null || {
  echo -e "  ${YELLOW}!${NC} Could not push migration via CLI, will need manual SQL execution"
  echo -e "  Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
  echo -e "  Paste the contents of: supabase/migrations/001_initial_schema.sql"
  echo -e "  And click Run"
}

# --- Write .env.local ---
echo ""
echo -e "${BLUE}Writing .env.local...${NC}"
cat > "$ENV_FILE" << EOF
NEXT_PUBLIC_SUPABASE_URL=${PROJECT_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
CRON_SECRET=${CRON_SECRET}
# SearXNG instance URL (leave empty to skip SearXNG and use Nitter RSS only)
SEARXNG_URL=
# Nitter instance for RSS fallback
NITTER_INSTANCE_URL=https://xcancel.com
EOF

echo -e "  ${GREEN}✓${NC} Written to $ENV_FILE"

# --- Summary ---
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Project URL:    ${PROJECT_URL}"
echo -e "  Dashboard:      https://supabase.com/dashboard/project/${PROJECT_REF}"
echo -e "  CRON_SECRET:    ${CRON_SECRET:0:10}..."
echo ""
echo -e "  Next steps:"
echo -e "    1. cd \"$PROJECT_DIR\""
echo -e "    2. npm run dev:web"
echo -e "    3. Open http://localhost:3000"
echo -e "    4. Go to http://localhost:3000/admin to add X sources"
echo -e "    5. Test the scraper:"
echo -e "       curl -H \"Authorization: Bearer ${CRON_SECRET}\" http://localhost:3000/api/cron/fetch-posts"
echo ""
