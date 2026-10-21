from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base

app = FastAPI(
    title="Smart Campus Lost & Found API",
    description="API for managing lost and found items, matching, claims, and handovers on campus.",
    version="1.0.0"
)

# Startup event to pre-warm MySQL TLS connection pool
@app.on_event("startup")
def startup_warmup():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        print(f"Startup warmup warning: {e}")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Smart Campus Lost & Found API"}

# Include routers
from app.api.routers import auth, items, matches, claims, admin
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(items.router, prefix="/api/v1", tags=["items"])
app.include_router(matches.router, prefix="/api/v1", tags=["matches"])
app.include_router(claims.router, prefix="/api/v1", tags=["claims"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])

