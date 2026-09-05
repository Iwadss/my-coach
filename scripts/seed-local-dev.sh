#!/bin/bash
# Seeds this checkout's isolated local Supabase instance (project_id
# "my-coach-claude", API port 54421 — see supabase/config.toml) with a
# working set of test accounts for the admin/coach/client hierarchy:
#   - admin:  muhammadifwad100@gmail.com / AdminDev123!
#   - coach1: coach1@example.com / CoachPass123! (approved, 1 slot 09:00-10:00)
#   - coach2: coach2@example.com / CoachPass123! (approved, 1 slot 14:00-15:00)
#   - client1: client1@example.com / ClientPass123! (pending request to coach1)
#
# Run after `supabase db reset` (which wipes all data). Requires the local
# stack to be running (`supabase start`) and `python3` on PATH.
#
# Note: the anon key below is Supabase's fixed local-dev demo key (same for
# every `supabase start` project everywhere) — not a real secret.
set -e
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
BASE="http://127.0.0.1:54421"

echo "--- admin ---"
curl -s -X POST "$BASE/auth/v1/signup" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"muhammadifwad100@gmail.com","password":"AdminDev123!","data":{"full_name":"Admin"}}' -o /dev/null -w "signup: %{http_code}\n"

docker exec supabase_db_my-coach-claude psql -U postgres -d postgres -q -c "
set session_replication_role = replica;
update public.profiles set role='admin' where email='muhammadifwad100@gmail.com';
set session_replication_role = origin;" > /dev/null

ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"muhammadifwad100@gmail.com","password":"AdminDev123!"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

echo "--- coach1 (approved) ---"
COACH_RESP=$(curl -s -X POST "$BASE/auth/v1/signup" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"coach1@example.com","password":"CoachPass123!","data":{"full_name":"Coach One"}}')
COACH_ID=$(echo "$COACH_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['id'])")
COACH_TOKEN=$(curl -s -X POST "$BASE/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"coach1@example.com","password":"CoachPass123!"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST "$BASE/rest/v1/coaches" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $COACH_TOKEN" \
  -H "Content-Type: application/json" -d "{\"id\":\"$COACH_ID\",\"status\":\"pending\"}" -o /dev/null -w "application: %{http_code}\n"

curl -s -X POST "$BASE/rest/v1/rpc/admin_set_coach_status" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" -d "{\"p_coach_id\":\"$COACH_ID\",\"p_status\":\"approved\"}" -w "approve: %{http_code}\n"

curl -s -X POST "$BASE/rest/v1/timeslots" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $COACH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"start_time\":\"09:00\",\"end_time\":\"10:00\",\"coach_id\":\"$COACH_ID\"}" -o /dev/null -w "timeslot: %{http_code}\n"

echo "--- coach2 (approved) ---"
COACH2_RESP=$(curl -s -X POST "$BASE/auth/v1/signup" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"coach2@example.com","password":"CoachPass123!","data":{"full_name":"Coach Two"}}')
COACH2_ID=$(echo "$COACH2_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['id'])")
COACH2_TOKEN=$(curl -s -X POST "$BASE/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"coach2@example.com","password":"CoachPass123!"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST "$BASE/rest/v1/coaches" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $COACH2_TOKEN" \
  -H "Content-Type: application/json" -d "{\"id\":\"$COACH2_ID\",\"status\":\"pending\"}" -o /dev/null -w "application: %{http_code}\n"

curl -s -X POST "$BASE/rest/v1/rpc/admin_set_coach_status" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" -d "{\"p_coach_id\":\"$COACH2_ID\",\"p_status\":\"approved\"}" -w "approve: %{http_code}\n"

curl -s -X POST "$BASE/rest/v1/timeslots" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $COACH2_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"start_time\":\"14:00\",\"end_time\":\"15:00\",\"coach_id\":\"$COACH2_ID\"}" -o /dev/null -w "timeslot: %{http_code}\n"

echo "--- client1 -> requests coach1 (pending) ---"
CLIENT_RESP=$(curl -s -X POST "$BASE/auth/v1/signup" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"client1@example.com","password":"ClientPass123!","data":{"full_name":"Client One"}}')
CLIENT_ID=$(echo "$CLIENT_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['id'])")
CLIENT_TOKEN=$(curl -s -X POST "$BASE/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"client1@example.com","password":"ClientPass123!"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST "$BASE/rest/v1/clients" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" -d "{\"id\":\"$CLIENT_ID\",\"email\":\"client1@example.com\",\"full_name\":\"Client One\"}" \
  -o /dev/null -w "clients row: %{http_code}\n"

curl -s -X POST "$BASE/rest/v1/coach_clients" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"client_id\":\"$CLIENT_ID\",\"coach_id\":\"$COACH_ID\",\"status\":\"pending\"}" \
  -o /dev/null -w "coach_clients request: %{http_code}\n"

echo "coach1_id=$COACH_ID" > /tmp/fixtures.env
echo "coach2_id=$COACH2_ID" >> /tmp/fixtures.env
echo "client1_id=$CLIENT_ID" >> /tmp/fixtures.env
echo "done. IDs written to /tmp/fixtures.env"
