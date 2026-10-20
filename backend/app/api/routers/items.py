from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.models import LostItem, FoundItem, Category, Location, User
from app.schemas.item import (
    LostItemCreate, LostItemResponse, 
    FoundItemCreate, FoundItemResponse, 
    CategoryResponse, LocationResponse
)
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@router.get("/locations", response_model=List[LocationResponse])
def get_locations(db: Session = Depends(get_db)):
    return db.query(Location).all()

@router.post("/lost-items", response_model=LostItemResponse, status_code=201)
def report_lost_item(
    item: LostItemCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Verify foreign keys
    if not db.query(Category).filter(Category.id == item.category_id).first():
        raise HTTPException(status_code=400, detail="Invalid category ID")
    if not db.query(Location).filter(Location.id == item.location_id).first():
        raise HTTPException(status_code=400, detail="Invalid location ID")

    db_item = LostItem(**item.model_dump(), user_id=current_user.id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/lost-items", response_model=List[LostItemResponse])
def get_lost_items(
    db: Session = Depends(get_db),
    category_id: Optional[int] = None,
    location_id: Optional[int] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    user_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100)
):
    query = db.query(LostItem)
    if user_id:
        query = query.filter(LostItem.user_id == user_id)
    if category_id: 
        query = query.filter(LostItem.category_id == category_id)
    if location_id: 
        query = query.filter(LostItem.location_id == location_id)
    if status: 
        query = query.filter(LostItem.status == status)
    if keyword: 
        query = query.filter(LostItem.title.ilike(f"%{keyword}%") | LostItem.description.ilike(f"%{keyword}%"))
    
    return query.order_by(LostItem.created_at.desc()).offset(skip).limit(limit).all()

@router.post("/found-items", response_model=FoundItemResponse, status_code=201)
def report_found_item(
    item: FoundItemCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Verify foreign keys
    if not db.query(Category).filter(Category.id == item.category_id).first():
        raise HTTPException(status_code=400, detail="Invalid category ID")
    if not db.query(Location).filter(Location.id == item.location_id).first():
        raise HTTPException(status_code=400, detail="Invalid location ID")

    db_item = FoundItem(**item.model_dump(), user_id=current_user.id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    # Note: In a real system, reporting a found item might asynchronously trigger the matching engine here
    return db_item

@router.get("/found-items", response_model=List[FoundItemResponse])
def get_found_items(
    db: Session = Depends(get_db),
    category_id: Optional[int] = None,
    location_id: Optional[int] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    user_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100)
):
    query = db.query(FoundItem)
    if user_id:
        query = query.filter(FoundItem.user_id == user_id)
    if category_id: 
        query = query.filter(FoundItem.category_id == category_id)
    if location_id: 
        query = query.filter(FoundItem.location_id == location_id)
    if status: 
        query = query.filter(FoundItem.status == status)
    if keyword: 
        query = query.filter(FoundItem.title.ilike(f"%{keyword}%") | FoundItem.description.ilike(f"%{keyword}%"))
    
    return query.order_by(FoundItem.created_at.desc()).offset(skip).limit(limit).all()
