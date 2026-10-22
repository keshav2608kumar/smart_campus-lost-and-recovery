import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    users = conn.execute(text("SELECT id, email, role, is_active FROM users;")).fetchall()
    print("Local users:")
    for u in users:
        print(" ", u)
    cats = conn.execute(text("SELECT id, name FROM categories;")).fetchall()
    print("Local categories:", len(cats))
    locs = conn.execute(text("SELECT id, name FROM locations;")).fetchall()
    print("Local locations:", len(locs))
    losts = conn.execute(text("SELECT id, title, status FROM lost_items;")).fetchall()
    print("Local lost_items:", len(losts))
    founds = conn.execute(text("SELECT id, title, status FROM found_items;")).fetchall()
    print("Local found_items:", len(founds))
