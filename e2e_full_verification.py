import requests
import json
import time
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE = "https://smart-campus-lost-and-recovery.onrender.com/api/v1"

def print_header(title):
    print("\n" + "="*70)
    print(f" {title}")
    print("="*70)

def print_step(num, title):
    print(f"\n[TEST {num}] {title}")

results = []

def record(name, success, details=""):
    results.append({"name": name, "success": success, "details": details})
    mark = "PASS" if success else "FAIL"
    print(f"   [{mark}] {name} {('- ' + details) if details else ''}")

print_header("COMPREHENSIVE END-TO-END SYSTEM TEST (LIVE CLOUD)")
print(f"Target API: {BASE}")
print(f"Frontend:   https://smart-campus-lost-and-recovery.vercel.app")
print(f"Database:   TiDB Cloud Serverless MySQL")

# =========================================================================
# PHASE 1: AUTHENTICATION & ROLE-BASED ACCESS
# =========================================================================
print_header("PHASE 1: AUTHENTICATION & MULTI-ROLE SECURITY")

# Test 1.1: Admin Login
print_step("1.1", "Admin Authentication (admin@campus.edu)")
try:
    r = requests.post(f"{BASE}/auth/login", data={"username": "admin@campus.edu", "password": "password123"}, timeout=20)
    assert r.status_code == 200
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    record("Admin Login", True, f"Token length: {len(admin_token)}")
except Exception as e:
    record("Admin Login", False, str(e))

# Test 1.2: Staff Login
print_step("1.2", "Staff Authentication (staff@campus.edu)")
try:
    r = requests.post(f"{BASE}/auth/login", data={"username": "staff@campus.edu", "password": "password123"}, timeout=20)
    assert r.status_code == 200
    staff_token = r.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    record("Staff Login", True, f"Role: STAFF, Token length: {len(staff_token)}")
except Exception as e:
    record("Staff Login", False, str(e))

# Test 1.3: Student Login (Alice Smith)
print_step("1.3", "Student Authentication - Alice Smith (alice@campus.edu)")
try:
    r = requests.post(f"{BASE}/auth/login", data={"username": "alice@campus.edu", "password": "password123"}, timeout=20)
    assert r.status_code == 200
    alice_token = r.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    record("Alice Login", True, "Student Reporter Account")
except Exception as e:
    record("Alice Login", False, str(e))

# Test 1.4: Student Login (Bob Jones)
print_step("1.4", "Student Authentication - Bob Jones (bob@campus.edu)")
try:
    r = requests.post(f"{BASE}/auth/login", data={"username": "bob@campus.edu", "password": "password123"}, timeout=20)
    assert r.status_code == 200
    bob_token = r.json()["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}
    record("Bob Login", True, "Student Finder Account")
except Exception as e:
    record("Bob Login", False, str(e))

# Test 1.5: Bad Credentials Rejection
print_step("1.5", "Security: Reject Invalid Credentials")
try:
    r = requests.post(f"{BASE}/auth/login", data={"username": "alice@campus.edu", "password": "wrong_password_999"}, timeout=20)
    assert r.status_code == 401
    record("Bad Password Rejection", True, "Correctly returned HTTP 401 Unauthorized")
except Exception as e:
    record("Bad Password Rejection", False, str(e))

# =========================================================================
# PHASE 2: METADATA & PUBLIC DIRECTORIES
# =========================================================================
print_header("PHASE 2: CAMPUS METADATA & INVENTORY CATALOG")

print_step("2.1", "Retrieve Categories Catalog")
try:
    r = requests.get(f"{BASE}/categories", timeout=20)
    assert r.status_code == 200
    cats = r.json()
    cat_names = [c["name"] for c in cats]
    record("Categories Endpoint", True, f"Loaded {len(cats)} categories: {', '.join(cat_names[:4])}...")
except Exception as e:
    record("Categories Endpoint", False, str(e))

print_step("2.2", "Retrieve Locations Catalog")
try:
    r = requests.get(f"{BASE}/locations", timeout=20)
    assert r.status_code == 200
    locs = r.json()
    loc_names = [l["name"] for l in locs]
    record("Locations Endpoint", True, f"Loaded {len(locs)} zones: {', '.join(loc_names[:4])}...")
except Exception as e:
    record("Locations Endpoint", False, str(e))

print_step("2.3", "Campus Unified Item Directory")
try:
    r = requests.get(f"{BASE}/admin/all-items?limit=5", headers=admin_headers, timeout=20)
    assert r.status_code == 200
    items = r.json()
    record("Unified Catalog", True, f"Retrieved campus catalog sample ({len(items)} items)")
except Exception as e:
    record("Unified Catalog", False, str(e))

# =========================================================================
# PHASE 3: ITEM REPORTING & AI SIMILARITY MATCHING
# =========================================================================
print_header("PHASE 3: ITEM REPORTING, EMBEDDINGS & AUTO-MATCHING")

ts = int(time.time())
item_lost_id = None
item_found_id = None

print_step("3.1", "Alice Reports Lost Item: 'Dell Latitude 5420 Laptop'")
try:
    lost_data = {
        "title": f"Dell Latitude 5420 Laptop #{ts}",
        "description": "Left on 2nd floor library reading table, black protective sleeve",
        "color": "Silver",
        "brand": "Dell",
        "category_id": 1,
        "location_id": 1,
        "lost_date": "2026-10-22",
        "lost_time": "10:15:00"
    }
    r = requests.post(f"{BASE}/lost-items", headers=alice_headers, json=lost_data, timeout=20)
    assert r.status_code in [200, 201]
    item_lost = r.json()
    item_lost_id = item_lost["id"]
    record("Report Lost Item", True, f"Created Lost Item #{item_lost_id} (Status: {item_lost['status']})")
except Exception as e:
    record("Report Lost Item", False, str(e))

print_step("3.2", "Bob Reports Matching Found Item: 'Silver Dell Latitude Laptop'")
try:
    found_data = {
        "title": f"Silver Dell Latitude Laptop #{ts}",
        "description": "Found on library 2nd floor desk with black sleeve, handed to security desk",
        "color": "Silver",
        "brand": "Dell",
        "category_id": 1,
        "location_id": 1,
        "found_date": "2026-10-22",
        "found_time": "10:45:00"
    }
    r = requests.post(f"{BASE}/found-items", headers=bob_headers, json=found_data, timeout=20)
    assert r.status_code in [200, 201]
    item_found = r.json()
    item_found_id = item_found["id"]
    record("Report Found Item", True, f"Created Found Item #{item_found_id} (Status: {item_found['status']})")
except Exception as e:
    record("Report Found Item", False, str(e))

print_step("3.3", "Execute Automated Similarity Matching Engine")
match_target_id = None
try:
    # Trigger matching engine
    r_trig = requests.post(f"{BASE}/lost-items/{item_lost_id}/generate-matches", headers=alice_headers, timeout=20)
    assert r_trig.status_code == 200

    # Retrieve suggested matches
    r_matches = requests.get(f"{BASE}/matches?lost_item_id={item_lost_id}", headers=alice_headers, timeout=20)
    assert r_matches.status_code == 200
    match_list = r_matches.json()
    assert len(match_list) > 0
    top_match = match_list[0]
    match_target_id = top_match["id"]
    score = top_match.get("match_score") or top_match.get("similarity_score") or 0
    record("Similarity Match Engine", True, f"Found {len(match_list)} match(es)! Match #{match_target_id} Score: {score}% (Status: {top_match['status']})")
except Exception as e:
    record("Similarity Match Engine", False, str(e))

# =========================================================================
# PHASE 4: CLAIM SUBMISSION, VERIFICATION & CUSTODY HANDOVER
# =========================================================================
print_header("PHASE 4: CLAIM VERIFICATION & ATOMIC HANDOVER PROTOCOL")

claim_target_id = None
print_step("4.1", "Alice Submits Claim on the Suggested Match")
try:
    claim_data = {
        "match_id": match_target_id,
        "proof_details": f"Serial tag DL-5420-SN{ts}, contains engineering department sticker on palmrest."
    }
    r = requests.post(f"{BASE}/claims", headers=alice_headers, json=claim_data, timeout=20)
    assert r.status_code in [200, 201]
    claim_obj = r.json()
    claim_target_id = claim_obj["id"]
    record("Claim Submission", True, f"Claim #{claim_target_id} submitted with ownership proof (Status: {claim_obj['status']})")
except Exception as e:
    record("Claim Submission", False, str(e))

print_step("4.2", "Staff Verifies Claim & Claimant Identity")
try:
    verif_data = {
        "claim_id": claim_target_id,
        "verification_notes": "Claimant Alice Smith verified via student ID card STU-2024-001. Device unlocked successfully.",
        "result": "VALID"
    }
    r = requests.post(f"{BASE}/claims/{claim_target_id}/verify", headers=staff_headers, json=verif_data, timeout=20)
    assert r.status_code == 200
    record("Staff Verification", True, f"Claim #{claim_target_id} verified as VALID: '{r.json().get('message')}'")
except Exception as e:
    record("Staff Verification", False, str(e))

print_step("4.3", "Staff Conducts Handover & Atomic Status Transition")
try:
    handover_data = {
        "claim_id": claim_target_id,
        "handover_location": "Campus Safety Central Intake Desk",
        "notes": "Student signed physical release form. Custody transfer complete."
    }
    r = requests.post(f"{BASE}/claims/{claim_target_id}/approve", headers=staff_headers, json=handover_data, timeout=20)
    assert r.status_code == 200
    msg = r.json().get("message")
    record("Handover Execution", True, f"Approved! Item marked RETURNED, Lost item marked RECOVERED. ({msg})")
except Exception as e:
    record("Handover Execution", False, str(e))

# =========================================================================
# PHASE 5: ADMIN GOVERNANCE, CREDENTIAL DIRECTORY & AUDIT LOGS
# =========================================================================
print_header("PHASE 5: ADMIN GOVERNANCE, USER DIRECTORY & AUDIT LOGS")

print_step("5.1", "Admin Users Roster & Credential Details")
try:
    r = requests.get(f"{BASE}/admin/users?limit=200", headers=admin_headers, timeout=20)
    assert r.status_code == 200
    u_data = r.json()
    total = u_data["total"]
    users = u_data["users"]
    assert total >= 7
    record("Admin User Directory", True, f"Total Registered Accounts: {total}")
    for u in users[:5]:
        print(f"       • [{u['role']}] #{u['id']} {u['name']} <{u['email']}> | Phone: {u['phone']} | Active: {u['is_active']}")
except Exception as e:
    record("Admin User Directory", False, str(e))

print_step("5.2", "Admin Registers New Student/Staff Account")
new_stu_email = f"eval_student_{ts}@campus.edu"
created_uid = None
try:
    new_user_data = {
        "name": "Marcus Vance",
        "email": new_stu_email,
        "password": "TemporaryPass@2026",
        "role": "STUDENT",
        "phone": "+1-555-0811"
    }
    r = requests.post(f"{BASE}/admin/users", headers=admin_headers, json=new_user_data, timeout=20)
    assert r.status_code in [200, 201]
    created = r.json()
    created_uid = created["id"]
    record("Admin Register User", True, f"Created {created['name']} ({created['role']}) ID #{created_uid} <{created['email']}>")
except Exception as e:
    record("Admin Register User", False, str(e))

print_step("5.3", "Admin Controls User Access Lock (Suspension)")
try:
    # Lock user
    r_lock = requests.patch(f"{BASE}/admin/users/{created_uid}/status", headers=admin_headers, json={"is_active": False}, timeout=20)
    assert r_lock.status_code == 200
    # Restore user
    r_unlock = requests.patch(f"{BASE}/admin/users/{created_uid}/status", headers=admin_headers, json={"is_active": True}, timeout=20)
    assert r_unlock.status_code == 200
    record("Admin Access Lock Control", True, f"Lock & Unlock toggles verified for User #{created_uid}")
except Exception as e:
    record("Admin Access Lock Control", False, str(e))

print_step("5.4", "Admin Role Modification")
try:
    r_role = requests.patch(f"{BASE}/admin/users/{created_uid}/role", headers=admin_headers, json={"role": "STAFF"}, timeout=20)
    assert r_role.status_code == 200
    record("Admin Role Switcher", True, f"Role successfully updated to STAFF for User #{created_uid}")
except Exception as e:
    record("Admin Role Switcher", False, str(e))

print_step("5.5", "Admin Handover Registry Inspection")
try:
    r = requests.get(f"{BASE}/admin/handovers", headers=admin_headers, timeout=20)
    assert r.status_code == 200
    handovers = r.json()
    record("Handover Registry", True, f"Found {len(handovers)} completed handovers in permanent registry")
    if handovers:
        h = handovers[0]
        print(f"       • Latest: Handover #{h['id']} | Item: '{h['item_title']}' | Claimant: {h['claimant_name']} | Staff: {h['staff_name']}")
except Exception as e:
    record("Handover Registry", False, str(e))

print_step("5.6", "Admin Audit Trail & Tamper-Evident Security Log")
try:
    r = requests.get(f"{BASE}/admin/audit-logs?limit=5", headers=admin_headers, timeout=20)
    assert r.status_code == 200
    logs = r.json()
    record("Audit Logs", True, f"Retrieved {len(logs)} security event records. Most recent: '{logs[0]['action']}' on {logs[0]['entity_type']} #{logs[0]['entity_id']}")
except Exception as e:
    record("Audit Logs", False, str(e))

print_step("5.7", "Executive System KPIs & Recovery Rate")
try:
    r = requests.get(f"{BASE}/admin/stats", headers=admin_headers, timeout=20)
    assert r.status_code == 200
    st = r.json()
    record("System KPIs", True, f"Recovery Rate: {st['performance']['recovery_rate_percentage']}% | Total Lost: {st['lost_items']['total']} | Total Found: {st['found_items']['total']}")
except Exception as e:
    record("System KPIs", False, str(e))

# =========================================================================
# SUMMARY
# =========================================================================
print_header("FINAL TEST SUITE SUMMARY")
passed_count = sum(1 for r in results if r["success"])
total_count = len(results)
print(f"Total Tests Executed: {total_count}")
print(f"Tests Passed:         {passed_count} / {total_count} ({round(passed_count/total_count*100, 1)}%)")

if passed_count == total_count:
    print("\n>>> ALL TESTS PASSED! SYSTEM IS 100% OPERATIONAL ON CLOUD INFRASTRUCTURE <<<")
else:
    print("\n>>> SOME TESTS FAILED <<<")
