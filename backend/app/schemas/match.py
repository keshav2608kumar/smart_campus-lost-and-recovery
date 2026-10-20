from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.schemas.item import LostItemResponse, FoundItemResponse

class MatchBase(BaseModel):
    lost_item_id: int
    found_item_id: int
    match_score: float

class MatchResponse(MatchBase):
    id: int
    status: str
    matching_details: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    
    lost_item: Optional[LostItemResponse] = None
    found_item: Optional[FoundItemResponse] = None

    class Config:
        from_attributes = True
