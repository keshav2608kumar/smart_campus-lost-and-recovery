from sqlalchemy import Boolean, Column, Integer, String, Text, Date, Time, Numeric, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.mysql import TIMESTAMP
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="STUDENT", nullable=False)
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    lost_items = relationship("LostItem", back_populates="user", cascade="all, delete-orphan")
    found_items = relationship("FoundItem", back_populates="user", cascade="all, delete-orphan")
    claims = relationship("Claim", foreign_keys="[Claim.claimant_id]", back_populates="claimant")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    building = Column(String(100))
    floor = Column(String(50))
    description = Column(Text)

class LostItem(Base):
    __tablename__ = "lost_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    color = Column(String(50))
    brand = Column(String(100))
    unique_features = Column(Text)
    lost_date = Column(Date, nullable=False, index=True)
    lost_time = Column(Time)
    status = Column(String(30), default="ACTIVE", nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="lost_items")
    category = relationship("Category")
    location = relationship("Location")
    matches = relationship("Match", foreign_keys="[Match.lost_item_id]", back_populates="lost_item")

class FoundItem(Base):
    __tablename__ = "found_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    color = Column(String(50))
    brand = Column(String(100))
    unique_features = Column(Text)
    found_date = Column(Date, nullable=False, index=True)
    found_time = Column(Time)
    status = Column(String(30), default="AVAILABLE", nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="found_items")
    category = relationship("Category")
    location = relationship("Location")
    matches = relationship("Match", foreign_keys="[Match.found_item_id]", back_populates="found_item")

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lost_item_id = Column(Integer, ForeignKey("lost_items.id", ondelete="CASCADE"), nullable=False, index=True)
    found_item_id = Column(Integer, ForeignKey("found_items.id", ondelete="CASCADE"), nullable=False, index=True)
    match_score = Column(Numeric(5, 2), nullable=False)
    matching_details = Column(JSON)
    status = Column(String(30), default="SUGGESTED", nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    lost_item = relationship("LostItem", back_populates="matches")
    found_item = relationship("FoundItem", back_populates="matches")
    claims = relationship("Claim", back_populates="match", cascade="all, delete-orphan")

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    claimant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    proof_details = Column(Text, nullable=False)
    status = Column(String(30), default="PENDING", nullable=False, index=True)
    submitted_at = Column(TIMESTAMP, server_default=func.now())
    reviewed_at = Column(TIMESTAMP, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    match = relationship("Match", back_populates="claims")
    claimant = relationship("User", foreign_keys=[claimant_id], back_populates="claims")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    verification = relationship("Verification", back_populates="claim", uselist=False)
    handover = relationship("Handover", back_populates="claim", uselist=False)

class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claims.id", ondelete="CASCADE"), nullable=False, unique=True)
    verifier_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    verification_notes = Column(Text)
    result = Column(String(30), nullable=False)
    verified_at = Column(TIMESTAMP, server_default=func.now())

    claim = relationship("Claim", back_populates="verification")
    verifier = relationship("User")

class Handover(Base):
    __tablename__ = "handovers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    claim_id = Column(Integer, ForeignKey("claims.id", ondelete="CASCADE"), nullable=False, unique=True)
    staff_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    handover_location = Column(String(150), nullable=False)
    handover_time = Column(TIMESTAMP, nullable=False)
    notes = Column(Text)

    claim = relationship("Claim", back_populates="handover")
    staff = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    action = Column(String(100), nullable=False)
    old_status = Column(String(50))
    new_status = Column(String(50))
    details = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)

    user = relationship("User")
