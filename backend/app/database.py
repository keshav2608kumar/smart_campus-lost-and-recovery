from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Determine database URL
if settings.DATABASE_URL:
    url = settings.DATABASE_URL
    # Ensure driver is pymysql
    if url.startswith("mysql://"):
        url = url.replace("mysql://", "mysql+pymysql://", 1)
    SQLALCHEMY_DATABASE_URL = url
else:
    SQLALCHEMY_DATABASE_URL = (
        f"mysql+pymysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}"
        f"@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DATABASE}"
    )

connect_args = {}
# Support cloud databases requiring SSL (e.g. TiDB Serverless, Aiven, PlanetScale)
if settings.MYSQL_SSL or settings.MYSQL_PORT in (4000, 33060) or "tidbcloud" in SQLALCHEMY_DATABASE_URL:
    connect_args["ssl"] = {"ssl_verify_cert": False}

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,   # Keep alive for 30 minutes to minimize TLS handshakes
    pool_pre_ping=True,  # Automatically tests connection freshness
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
