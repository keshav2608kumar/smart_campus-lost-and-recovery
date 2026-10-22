import requests
import json
import time
import sys

# Support UTF-8 encoding in Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "https://smart-campus-lost-and-recovery.onrender.com/api/v1"

print("==================================================")
print("SMART CAMPUS LOST & FOUND - LIVE VERIFICATION SUITE")
print("==================================================")

session = requests.Session()

# 1. Test Admin Login
print("\n[1] Testing Admin Login...")
res = session.post(
    f"{BASE_URL}/auth/login",
    data={"username": "admin@campus.edu", "password": "password123"},
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
assert res.status_code == 200, f"Admin login failed: {res.text}"
admin_token = res.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}
print(f"✅ Admin Login Successful! Token received (length: {len(admin_token)})")

# 2. Test Staff Login
print("\n[2] Testing Staff Login...")
res = requests.post(
    f"{BASE_URL}/auth/login",
    data={"username": "staff@campus.edu", "password": "password123"},
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
assert res.status_code == 200, f"Staff login failed: {res.text}"
staff_token = res.json()["access_token"]
staff_headers = {"Authorization": f"Bearer {staff_token}"}
print("✅ Staff Login Successful!")

# 3. Test Student Login
print("\n[3] Testing Student Login (Alice Smith)...")
res = requests.post(
    f"{BASE_URL}/auth/login",
    data={"username": "alice@campus.edu", "password": "password123"},
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
assert res.status_code == 200, f"Student login failed: {res.text}"
alice_token = res.json()["access_token"]
alice_headers = {"Authorization": f"Bearer {alice_token}"}
print("✅ Student Login (Alice) Successful!")

# 4. Check System Stats
print("\n[4] Testing System Statistics (Admin)...")
res = session.get(f"{BASE_URL}/admin/stats", headers=admin_headers)
assert res.status_code == 200, f"Stats failed: {res.text}"
stats = res.json()
print(f"✅ Total Accounts: {stats['users']['total']} (Students: {stats['users']['students']}, Staff: {stats['users']['staff']}, Admins: {stats['users']['admins']})")
print(f"✅ Lost Items: {stats['lost_items']['total']} | Found Items: {stats['found_items']['total']} | Claims: {stats['claims']['total']}")
print(f"✅ Recovery Rate: {stats['performance']['recovery_rate_percentage']}%")

# 5. Check User Directory
print("\n[5] Testing User Directory (Admin Users List)...")
res = session.get(f"{BASE_URL}/admin/users?limit=200", headers=admin_headers)
assert res.status_code == 200, f"Get users failed: {res.text}"
users_data = res.json()
print(f"✅ Found {users_data['total']} users in TiDB database:")
for u in users_data["users"]:
    status_str = "ACTIVE" if u["is_active"] else "LOCKED"
    print(f"   • [{u['role']}] ID #{u['id']}: {u['name']} <{u['email']}> | Phone: {u['phone']} | Status: {status_str}")

# 6. Test Admin Registering a New Student / Staff
timestamp = int(time.time())
new_email = f"verified_student_{timestamp}@campus.edu"
print(f"\n[6] Testing Admin Registering a New Student: {new_email}...")
res = session.post(
    f"{BASE_URL}/admin/users",
    headers=admin_headers,
    json={
        "name": "Jordan Lee",
        "email": new_email,
        "password": "initialPassword2026",
        "role": "STUDENT",
        "phone": "+1-555-0999"
    }
)
assert res.status_code in [200, 201], f"Register user failed: {res.text}"
new_user = res.json()
new_user_id = new_user["id"]
print(f"✅ Registered New User ID #{new_user_id} ({new_user['name']}, {new_user['role']})")

# 7. Test Locking & Unlocking User (Access Control)
print(f"\n[7] Testing Locking (Suspension) of User ID #{new_user_id}...")
res = session.patch(
    f"{BASE_URL}/admin/users/{new_user_id}/status",
    headers=admin_headers,
    json={"is_active": False}
)
assert res.status_code == 200, f"Suspend failed: {res.text}"
print(f"✅ User ID #{new_user_id} status changed: is_active = {res.json()['is_active']} (Access Locked)")

# Verify locked user cannot login
res_fail = requests.post(
    f"{BASE_URL}/auth/login",
    data={"username": new_email, "password": "initialPassword2026"},
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
print(f"   • Verification: Locked user login attempt returned status {res_fail.status_code}: {res_fail.json().get('detail')}")
assert res_fail.status_code == 403, f"Expected 403 for locked user, got {res_fail.status_code}"

# Unlock user again
print(f"   • Unlocking (Restoring Access) for User ID #{new_user_id}...")
res = session.patch(
    f"{BASE_URL}/admin/users/{new_user_id}/status",
    headers=admin_headers,
    json={"is_active": True}
)
assert res.status_code == 200
print(f"✅ User ID #{new_user_id} restored: is_active = {res.json()['is_active']} (Access Granted)")

# 8. Test Admin Resetting Password
print(f"\n[8] Testing Admin Password Reset for User ID #{new_user_id}...")
new_password = "UpdatedPassword@2026"
res = session.patch(
    f"{BASE_URL}/admin/users/{new_user_id}/reset-password",
    headers=admin_headers,
    json={"new_password": new_password}
)
assert res.status_code == 200, f"Password reset failed: {res.text}"
print(f"✅ Password reset response: {res.json()['message']}")

# Test login with newly set password
res_login_new = requests.post(
    f"{BASE_URL}/auth/login",
    data={"username": new_email, "password": new_password},
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
assert res_login_new.status_code == 200, f"Login with reset password failed: {res_login_new.text}"
print("✅ Login with newly set password SUCCEEDED!")

# 9. Test Reporting Lost Item & Auto-Matching
print("\n[9] Testing Student Item Report & Automated Matching...")
res = session.post(
    f"{BASE_URL}/lost-items",
    headers=alice_headers,
    json={
        "title": f"Black Leather Wallet #{timestamp}",
        "description": "Lost near library study cubicle, contains university ID",
        "category_id": 2,
        "location_id": 1,
        "color": "Black",
        "brand": "Fossil",
        "lost_date": "2026-10-22",
        "lost_time": "11:30:00"
    }
)
assert res.status_code in [200, 201], f"Report lost failed: {res.text}"
lost_item = res.json()
print(f"✅ Alice reported lost item ID #{lost_item['id']}: {lost_item['title']}")

# 10. Check All Campus Items Catalog
print("\n[10] Testing Unified Campus Inventory Endpoint...")
res = session.get(f"{BASE_URL}/admin/all-items?limit=10", headers=admin_headers)
assert res.status_code == 200, f"All items failed: {res.text}"
items = res.json()
print(f"✅ Retrieved {len(items)} items from campus catalog. Most recent: '{items[0]['title']}' ({items[0]['type']})")

print("\n==================================================")
print("🎉 ALL 10 END-TO-END DEPLOYED CHECKS PASSED PERFECTLY!")
print("==================================================")
