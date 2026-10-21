from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.models import Match, LostItem, User, FoundItem
from app.schemas.match import MatchResponse
from app.api.dependencies import get_current_user
from app.services.matching_engine import generate_matches_for_lost_item

router = APIRouter()

@router.post("/lost-items/{lost_item_id}/generate-matches")
def trigger_matching(
    lost_item_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lost_item = db.query(LostItem).filter(LostItem.id == lost_item_id).first()
    if not lost_item:
        raise HTTPException(status_code=404, detail="Lost item not found")
        
    if lost_item.user_id != current_user.id and current_user.role == "STUDENT":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    matches = generate_matches_for_lost_item(db, lost_item)
    return {"message": f"Generated {len(matches)} new matches."}

@router.get("/matches", response_model=List[MatchResponse])
def get_matches(
    db: Session = Depends(get_db),
    lost_item_id: Optional[int] = None,
    status: Optional[str] = None,
    min_score: Optional[float] = None,
    current_user: User = Depends(get_current_user)
):
    query = db.query(Match).options(
        joinedload(Match.lost_item),
        joinedload(Match.found_item)
    ).join(LostItem)
    
    # Students can only see matches for their own lost items
    if current_user.role == "STUDENT":
        query = query.filter(LostItem.user_id == current_user.id)
        
    if lost_item_id:
        query = query.filter(Match.lost_item_id == lost_item_id)
    if status:
        query = query.filter(Match.status == status)
    if min_score:
        query = query.filter(Match.match_score >= min_score)
        
    return query.order_by(Match.match_score.desc()).all()

@router.get("/matches/{match_id}", response_model=MatchResponse)
def get_match(
    match_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    # Check permissions
    if current_user.role == "STUDENT" and match.lost_item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this match")
        
    return match
