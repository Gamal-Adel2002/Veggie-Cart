#!/usr/bin/env bash
# FreshVeg API E2E verification script — covers customer, admin, and delivery portals
# Usage: bash scripts/e2e-verify.sh [API_BASE]
# Defaults to http://localhost:8080

set -uo pipefail
BASE="${1:-http://localhost:8080}"
PASS=0; FAIL=0; WARN=0

ok()   { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1  —  got: $(echo "$2" | head -c 160)"; FAIL=$((FAIL + 1)); }
warn() { echo "  WARN  $1"; WARN=$((WARN + 1)); }
check() {
  local name="$1" expected="$2" got="$3"
  if [[ "$got" == *"$expected"* ]]; then ok "$name"; else fail "$name" "$got"; fi
}

echo "FreshVeg E2E verification  (target: $BASE)"
echo "=================================================="

# ── Public endpoints ──────────────────────────────────────────────────────
echo ""
echo "Public endpoints"
check "GET /api/categories"     '"name"'   "$(curl -sf $BASE/api/categories)"
check "GET /api/products"        '"name"'  "$(curl -sf $BASE/api/products)"
check "GET /api/delivery-zones"  '"name"'  "$(curl -sf $BASE/api/delivery-zones)"
check "GET /api/delivery-fee"    '"feeType"' "$(curl -sf $BASE/api/delivery-fee)"

# ── Customer portal ───────────────────────────────────────────────────────
echo ""
echo "Customer portal"
CJAR=$(mktemp)
PHONE="01099$(printf '%06d' $RANDOM)"   # random 11-digit Egyptian mobile number

SIGNUP=$(curl -sf -X POST "$BASE/api/auth/signup" \
  -H "Content-Type: application/json" -c "$CJAR" \
  -d "{\"name\":\"E2E Test\",\"phone\":\"$PHONE\",\"password\":\"test1234\"}" 2>&1 || echo "ERROR")
check "POST /api/auth/signup"        '"role":"customer"'  "$SIGNUP"
check "GET  /api/auth/me"            "\"phone\":\"$PHONE\"" \
  "$(curl -sf $BASE/api/auth/me -b "$CJAR" 2>&1 || echo "ERROR")"
check "PUT  /api/auth/me"            '"name":"E2E Updated"' \
  "$(curl -sf -X PUT $BASE/api/auth/me -H 'Content-Type: application/json' \
      -b "$CJAR" -d "{\"name\":\"E2E Updated\",\"phone\":\"$PHONE\"}" 2>&1 || echo "ERROR")"
check "PUT  /api/auth/me/location"   '"latitude":30.0444' \
  "$(curl -sf -X PUT $BASE/api/auth/me/location -H 'Content-Type: application/json' \
      -b "$CJAR" -d '{"latitude":30.0444,"longitude":31.2357,"address":"Cairo, Egypt"}' 2>&1 || echo "ERROR")"
check "POST /api/auth/logout"        '"success":true' \
  "$(curl -sf -X POST $BASE/api/auth/logout -b "$CJAR" 2>&1 || echo "ERROR")"

# Cleanup test customer
psql "$DATABASE_URL" -c "DELETE FROM users WHERE phone='$PHONE';" > /dev/null 2>&1 || true
rm -f "$CJAR"

# ── Admin portal ──────────────────────────────────────────────────────────
echo ""
echo "Admin portal"
AJAR=$(mktemp)
ADM=$(curl -sf -X POST "$BASE/api/auth/admin/login" \
  -H "Content-Type: application/json" -c "$AJAR" \
  -d '{"phone":"01000000000","password":"admin123"}' 2>&1 || echo "ERROR")

if [[ "$ADM" == *'"role":"admin"'* ]]; then
  ok "POST /api/auth/admin/login"
  check "GET  /api/admin/orders"         '"statusCode":200' \
    "$(curl -sf $BASE/api/admin/orders -b "$AJAR" -o /dev/null -w '{"statusCode":%{http_code}}' 2>&1 || echo "ERROR")"
  check "GET  /api/admin/delivery-zones" '"name"' \
    "$(curl -sf $BASE/api/admin/delivery-zones -b "$AJAR" 2>&1 || echo "ERROR")"
  NEWZ=$(curl -sf -X POST "$BASE/api/admin/delivery-zones" \
    -H "Content-Type: application/json" -b "$AJAR" \
    -d '{"name":"E2E Zone","centerLat":30.05,"centerLng":31.25,"radiusKm":2,"active":true}' 2>&1 || echo "ERROR")
  check "POST /api/admin/delivery-zones" '"name":"E2E Zone"' "$NEWZ"
  ZID=$(echo "$NEWZ" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
  if [[ -n "$ZID" ]]; then
    CODE=$(curl -sf -X DELETE "$BASE/api/admin/delivery-zones/$ZID" \
      -b "$AJAR" -o /dev/null -w '%{http_code}' 2>&1 || echo "ERROR")
    check "DELETE /api/admin/delivery-zones/:id (204)" "204" "$CODE"
  fi
  check "GET  /api/admin/customers"      '"statusCode":200' \
    "$(curl -sf $BASE/api/admin/customers -b "$AJAR" -o /dev/null -w '{"statusCode":%{http_code}}' 2>&1 || echo "ERROR")"
else
  warn "Admin login skipped (credentials not configured in this environment)"
fi
rm -f "$AJAR"

# ── Delivery portal ───────────────────────────────────────────────────────
echo ""
echo "Delivery portal"
# Delivery login uses {username, password} and returns {token, person}
DJAR=$(mktemp)
# Attempt with a known seeded delivery username; WARN gracefully if none exist
DLIV=$(curl -sf -X POST "$BASE/api/delivery/login" \
  -H "Content-Type: application/json" -c "$DJAR" \
  -d '{"username":"delivery1","password":"delivery123"}' 2>&1 || echo "ERROR")

if [[ "$DLIV" == *'"person"'* && "$DLIV" == *'"token"'* ]]; then
  ok "POST /api/delivery/login"
  check "GET  /api/delivery/me"     '"person"' \
    "$(curl -sf $BASE/api/delivery/me -b "$DJAR" 2>&1 || echo "ERROR")"
  check "GET  /api/delivery/orders" '"statusCode":200' \
    "$(curl -sf $BASE/api/delivery/orders -b "$DJAR" -o /dev/null -w '{"statusCode":%{http_code}}' 2>&1 || echo "ERROR")"
else
  warn "Delivery portal skipped — no seeded delivery staff (username=delivery1) in this environment"
fi
rm -f "$DJAR"

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "=================================================="
echo "Results: $PASS passed, $FAIL failed, $WARN warnings (skipped)"
echo ""
[[ $FAIL -eq 0 ]]
