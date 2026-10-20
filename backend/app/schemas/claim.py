from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class ClaimCreate(BaseModel):
    match_id: int
    proof_details: str

class VerificationCreate(BaseModel):
    verification_notes: str
    result: str  # VERIFIED or INVALID

class HandoverCreate(BaseModel):
    handover_location: str
    notes: Optional[str] = None
    handover_time: Optional[str] = None  # ISO string from frontend

# --- Nested schemas for ClaimResponse ---
class FoundItemBrief(BaseModel):
    id: int
    title: str
    description: str
    found_date: Any
    class Config:
        from_attributes = True

class LostItemBrief(BaseModel):
    id: int
    title: str
    description: str
    lost_date: Any
    class Config:
        from_attributes = True

class MatchBrief(BaseModel):
    id: int
    match_score: float
    status: str
    found_item: Optional[FoundItemBrief] = None
    lost_item: Optional[LostItemBrief] = None
    class Config:
        from_attributes = True

class ClaimResponse(BaseModel):
    id: int
    match_id: int
    claimant_id: int
    proof_details: str
    status: str
    submitted_at: datetime
    match: Optional[MatchBrief] = None

    class Config:
        from_attributes = True
