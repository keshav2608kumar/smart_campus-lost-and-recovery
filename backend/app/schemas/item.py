from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time, datetime

class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    class Config:
        from_attributes = True

class LocationResponse(BaseModel):
    id: int
    name: str
    building: Optional[str] = None
    floor: Optional[str] = None
    description: Optional[str] = None
    class Config:
        from_attributes = True

class ItemBase(BaseModel):
    category_id: int
    location_id: int
    title: str
    description: str
    color: Optional[str] = None
    brand: Optional[str] = None
    unique_features: Optional[str] = None

class LostItemCreate(ItemBase):
    lost_date: date
    lost_time: Optional[time] = None

class LostItemResponse(LostItemCreate):
    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    category: CategoryResponse
    location: LocationResponse
    class Config:
        from_attributes = True

class FoundItemCreate(ItemBase):
    found_date: date
    found_time: Optional[time] = None

class FoundItemResponse(FoundItemCreate):
    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    category: CategoryResponse
    location: LocationResponse
    class Config:
        from_attributes = True
