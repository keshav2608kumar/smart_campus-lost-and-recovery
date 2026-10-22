import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from app.database import SessionLocal
from app.models.models import User
from app.auth.security import get_password_hash, verify_password

db = SessionLocal()

credentials = {
    'admin@campus.edu': 'admin123',
    'staff@campus.edu': 'staff123',
    'alice@campus.edu': 'student123',
    'bob@campus.edu': 'student123',
    'charlie@campus.edu': 'student123',
    'david@campus.edu': 'student123',
    'emma@campus.edu': 'student123',
}

for email, pwd in credentials.items():
    u = db.query(User).filter(User.email == email).first()
    if u:
        u.password_hash = get_password_hash(pwd)
        u.is_active = True
        print(f"Updated {email} -> password: {pwd}")
    else:
        print(f"User {email} not found")

db.commit()

# Verify
for email, pwd in credentials.items():
    u = db.query(User).filter(User.email == email).first()
    if u:
        ok = verify_password(pwd, u.password_hash)
        print(f"Verify {email} ({pwd}): {'OK' if ok else 'FAIL'}")

db.close()
