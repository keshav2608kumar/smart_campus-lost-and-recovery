import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from app.database import SessionLocal
from app.models.models import User

db = SessionLocal()
for u in db.query(User).all():
    print(u.id, u.email, u.role, u.password_hash)
db.close()
