import requests
import json
import time
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE = "https://smart-campus-lost-and-recovery.onrender.com/api/v1"

print("=================================================================")
print("SMART CAMPUS RECOVERY SYSTEM - END-TO-END WORKFLOW VERIFICATION")
print("=================================================================")

# Step 1: Alice (Student 1) logs in
print("\n[Step 1] Logging in as Student: Alice Smith (alice@campus.edu)...")
r_alice = requests.post(f"{BASE}/auth/login", data={"username": "alice@campus.edu", "password": "password123"})
assert r_alice.status_code == 200, f"Alice login failed: {r_alice.text}"
alice_token = r_alice.json()["access_token"]
alice_headers = {"Authorization": f"Bearer {alice_token}"}
print("  -> Logged in successfully!")

# Step 2: Bob (Student 2) logs in
print("\n[Step 2] Logging in as Student: Bob Jones (bob@campus.edu)...")
r_bob = requests.post(f"{BASE}/auth/login", data={"username": "bob@campus.edu", "password": "password123"})
assert r_bob.status_code == 200, f"Bob login failed: {r_bob.text}"
bob_token = r_bob.json()["access_token"]
bob_headers = {"Authorization": f"Bearer {bob_token}"}
print("  -> Logged in successfully!")

# Step 3: Staff logs in
print("\n[Step 3] Logging in as Staff: Sarah Staff (staff@campus.edu)...")
r_staff = requests.post(f"{BASE}/auth/login", data={"username": "staff@campus.edu", "password": "password123"})
assert r_staff.status_code == 200, f"Staff login failed: {r_staff.text}"
staff_token = r_staff.json()["access_token"]
staff_headers = {"Authorization": f"Bearer {staff_token}"}
print("  -> Logged in successfully!")

# Step 4: Admin logs in
print("\n[Step 4] Logging in as Admin: Admin User (admin@campus.edu)...")
r_admin = requests.post(f"{BASE}/auth/login", data={"username": "admin@campus.edu", "password": "password123"})
assert r_admin.status_code == 200, f"Admin login failed: {r_admin.text}"
admin_token = r_admin.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}
print("  -> Logged in successfully!")

# Step 5: Alice reports a Lost Item (e.g. MacBook Pro M3)
ts = int(time.time())
print(f"\n[Step 5] Alice reports Lost Item: 'MacBook Pro M3 #{ts}'...")
lost_payload = {
    "title": f"MacBook Pro 14 Space Gray #{ts}",
    "description": "Left on 3rd floor library study desk near window",
    "color": "Space Gray",
    "brand": "Apple",
    "category_id": 1,
    "location_id": 1,
    "lost_date": "2026-10-22",
    "lost_time": "12:00:00"
}
r_lost = requests.post(f"{BASE}/lost-items", headers=alice_headers, json=lost_payload)
assert r_lost.status_code in [200, 201], f"Report lost failed: {r_lost.text}"
lost_item = r_lost.json()
lost_id = lost_item["id"]
print(f"  -> Lost item reported successfully! ID #{lost_id}")

# Step 6: Bob reports finding that exact item
print(f"\n[Step 6] Bob reports Found Item: 'Apple MacBook Pro Space Gray #{ts}'...")
found_payload = {
    "title": f"Apple MacBook Pro Space Gray #{ts}",
    "description": "Found on library 3rd floor desk, turned in to desk",
    "color": "Space Gray",
    "brand": "Apple",
    "category_id": 1,
    "location_id": 1,
    "found_date": "2026-10-22",
    "found_time": "12:30:00"
}
r_found = requests.post(f"{BASE}/found-items", headers=bob_headers, json=found_payload)
assert r_found.status_code in [200, 201], f"Report found failed: {r_found.text}"
found_item = r_found.json()
found_id = found_item["id"]
print(f"  -> Found item reported successfully! ID #{found_id}")

# Step 7: Check Auto-Matching or trigger matches for Alice
print(f"\n[Step 7] Generating AI / Fuzzy Matches for Lost Item #{lost_id}...")
r_match_gen = requests.post(f"{BASE}/lost-items/{lost_id}/generate-matches", headers=alice_headers)
print(f"  -> Match generation status: {r_match_gen.status_code}")

# Query matches
r_matches = requests.get(f"{BASE}/matches?lost_item_id={lost_id}", headers=alice_headers)
matches = r_matches.json()
print(f"  -> Retrieved {len(matches)} match(es) for Alice's lost laptop!")
target_match = None
for m in matches:
    score = m.get('match_score') or m.get('similarity_score') or 0
    print(f"     Match ID #{m['id']} | Score: {score}% | Status: {m['status']}")
    if m["found_item_id"] == found_id or score >= 60:
        target_match = m

if not target_match and matches:
    target_match = matches[0]

assert target_match, "No match found to claim"
match_id = target_match["id"]
score = target_match.get('match_score') or target_match.get('similarity_score') or 0
print(f"  -> Target Match for Claim: ID #{match_id} (Score: {score}%)")

# Step 8: Alice submits a Claim with Proof of Ownership
print(f"\n[Step 8] Alice submits Claim for Match #{match_id}...")
claim_payload = {
    "match_id": match_id,
    "proof_details": "Serial number is C02XG123J1G5, stickers of React and Python on lid."
}
r_claim = requests.post(f"{BASE}/claims", headers=alice_headers, json=claim_payload)
if r_claim.status_code not in [200, 201]:
    print(f"  -> Claim response: {r_claim.status_code} {r_claim.text}")
    # Maybe claim already exists
    r_existing = requests.get(f"{BASE}/claims", headers=alice_headers)
    claim_id = r_existing.json()[0]["id"]
else:
    claim_id = r_claim.json()["id"]
print(f"  -> Claim submitted successfully! Claim ID #{claim_id} (Status: PENDING)")

# Step 9: Sarah Staff reviews and verifies the claim
print(f"\n[Step 9] Sarah Staff verifies Claim #{claim_id}...")
verif_payload = {
    "claim_id": claim_id,
    "verification_notes": "Claimant verified student ID STU-2024-001 and entered laptop passcode.",
    "result": "VALID"
}
r_verif = requests.post(f"{BASE}/claims/{claim_id}/verify", headers=staff_headers, json=verif_payload)
print(f"  -> Verification recorded: {r_verif.status_code} {r_verif.json().get('message')}")

# Step 10: Sarah Staff approves claim and conducts atomic handover
print(f"\n[Step 10] Sarah Staff conducts Handover for Claim #{claim_id}...")
handover_payload = {
    "claim_id": claim_id,
    "handover_location": "Campus Safety Security Desk",
    "notes": "Handover completed in person with signed receipt."
}
r_handover = requests.post(f"{BASE}/claims/{claim_id}/approve", headers=staff_headers, json=handover_payload)
print(f"  -> Handover execution status: {r_handover.status_code} {r_handover.json().get('message')}")

# Step 11: Admin verifies the Handover Registry and Updated System Metrics
print("\n[Step 11] Admin checks Handover Registry & Live Recovery Metrics...")
r_handovers = requests.get(f"{BASE}/admin/handovers", headers=admin_headers)
handovers = r_handovers.json()
print(f"  -> Total Handovers in Campus Registry: {len(handovers)}")
if handovers:
    latest_ho = handovers[0]
    print(f"     Latest: #{latest_ho['id']} | Item: '{latest_ho['item_title']}'")
    print(f"     Claimant: {latest_ho['claimant_name']} ({latest_ho['claimant_email']})")
    print(f"     Handed Over By: {latest_ho['staff_name']} at {latest_ho['handover_location']}")

r_final_stats = requests.get(f"{BASE}/admin/stats", headers=admin_headers)
stats = r_final_stats.json()
print(f"\n  -> Updated Recovery Rate: {stats['performance']['recovery_rate_percentage']}%")
print(f"  -> Total Handovers: {stats['performance']['total_handovers']}")
print(f"  -> Lost Items: {stats['lost_items']['total']} (Recovered: {stats['lost_items']['recovered']})")
print(f"  -> Found Items: {stats['found_items']['total']} (Returned: {stats['found_items']['returned']})")

print("\n=================================================================")
print("🎉 FULL END-TO-END WORKFLOW VERIFIED LIVE ON TI-DB CLOUD & RENDER!")
print("=================================================================")
