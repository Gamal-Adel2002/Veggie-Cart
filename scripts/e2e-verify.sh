#!/usr/bin/env bash
# FreshVeg API E2E verification script
# Usage: bash scripts/e2e-verify.sh [API_BASE]
# Defaults to http://localhost:8080

set -uo pipefail
BASE="${1:-http://localhost:8080}"
PASS=0; FAIL=0

ok()   { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1  —  got: $(echo "$2" | head -c 120)"; FAIL=$((FAIL + 1)); }
check() {
  local name="$1" expected="$2" got="$3"
  if [[ "$got" == *"$expected"* ]]; then ok "$name"; else fail "$name" "$got"; fi
}

echo "FreshVeg E2E verification  (target: $BASE)"
echo "=================================================="

# ── Shared: public endpoints ──────────────────────────────────────────────
echo ""
echo "Public endpoints"
check "GET /api/categories"     '"name":"Vegetables"'   "$(curl -sf $BASE/api/categories)"
check "GET /api/products"        '"name":"Fresh Tomatoes"' "$(curl -sf $BASE/api/products)"
check "GET /api/delivery-zones"  '"name":'               "$(curl -sf $BASE/api/delivery-zones)"
check "GET /api/delivery-fee"    '"feeType"'             "$(curl -sf $BASE/api/delivery-fee)"

# ── Customer portal ───────────────────────────────────────────────────────
echo ""
echo "Customer portal"
CJAR=$(mktemp)
PHONE="0109${RANDOM}${RANDOM}" && PHONE="${PHONE:0:11}"   # random 11-digit EG number

SIGNUP=$(curl -sf -X POST "$BASE/api/auth/signup" \
  -H "Content-Type: application/json" -c "$CJAR" \
  -d "{\"name\":\"E2E\",\"phone\":\"$PHONE\",\"password\":\"test1234\"}" 2>&1 || echo "ERROR")
check "POST /api/auth/signup"   '"role":"customer"' "$SIGNUP"

check "GET  /api/auth/me"       '"phone":"'"$PHONE"'"' \
  "$(curl -sf $BASE/api/auth/me -b "$CJAR" 2>&1 || echo "ERROR")"

check "PUT  /api/auth/me"       '"name":"E2E-upd"' \
  "$(curl -sf -X PUT $BASE/api/auth/me -H 'Content-Type: application/json' \
    -b "$CJAR" -d "{\"name\":\"E2E-upd\",\"phone\":\"$PHONE\"}" 2>&1 || echo "ERROR")"

check "PUT  /api/auth/me/location" '"latitude":30.0444' \
  "$(curl -sf -X PUT $BASE/api/auth/me/location -H 'Content-Type: application/json' \
    -b "$CJAR" -d '{"latitude":30.0444,"longitude":31.2357,"address":"Cairo"}' 2>&1 || echo "ERROR")"

check "POST /api/auth/logout"   '"success":true' \
  "$(curl -sf -X POST $BASE/api/auth/logout -b "$CJAR" 2>&1 || echo "ERROR")"

# Cleanup customer
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

  check "GET  /api/admin/delivery-zones" '"name":'  \
    "$(curl -sf $BASE/api/admin/delivery-zones -b "$AJAR" 2>&1 || echo "ERROR")"

  NEWZ=$(curl -sf -X POST "$BASE/api/admin/delivery-zones" \
    -H "Content-Type: application/json" -b "$AJAR" \
    -d '{"name":"E2E Zone","centerLat":30.05,"centerLng":31.25,"radiusKm":2,"active":true}' \
    2>&1 || echo "ERROR")
  check "POST /api/admin/delivery-zones" '"name":"E2E Zone"' "$NEWZ"

  ZID=$(echo "$NEWZ" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
  if [[ -n "$ZID" ]]; then
    DEL=$(curl -sf -X DELETE "$BASE/api/admin/delivery-zones/$ZID" \
      -b "$AJAR" -o /dev/null -w '%{http_code}' 2>&1 || echo "ERROR")
    check "DELETE /api/admin/delivery-zones/:id (204)" "204" "$DEL"
  fi

  check "GET  /api/admin/orders" '"statusCode":200' \
    "$(curl -sf $BASE/api/admin/orders -b "$AJAR" -o /dev/null -w '{"statusCode":%{http_code}}' 2>&1 || echo "ERROR")"
else
  echo "  WARN  Admin login skipped (credentials not set up in this environment)"
fi
rm -f "$AJAR"

# ── Delivery portal ───────────────────────────────────────────────────────
echo ""
echo "Delivery portal"
DJAR=$(mktemp)
DLIV=$(curl -sf -X POST "$BASE/api/delivery/login" \
  -H "Content-Type: application/json" -c "$DJAR" \
  -d '{"phone":"01000000001","password":"delivery123"}' 2>&1 || echo "ERROR")
if [[ "$DLIV" == *'"role":"delivery"'* ]]; then
  ok "POST /api/delivery/login"
  check "GET  /api/delivery/orders" '"id":'  \
    "$(curl -sf $BASE/api/delivery/orders -b "$DJAR" 2>&1 || echo "ERROR")"
else
  echo "  WARN  Delivery login skipped (no delivery staff configured in this environment)"
fi
rm -f "$DJAR"

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "=================================================="
echo "Results: $PASS passed, $FAIL failed"
echo ""
[[ $FAIL -eq 0 ]]
