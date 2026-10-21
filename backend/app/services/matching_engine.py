from sqlalchemy.orm import Session
from datetime import timedelta
from app.models.models import LostItem, FoundItem, Match, Location

def calculate_match_score(lost_item: LostItem, found: FoundItem, lost_location: Location, found_location: Location) -> tuple[int, dict]:
    score = 0
    details = {}
    
    # 1. Category (20%) - Already filtered by MySQL, so this is guaranteed
    score += 20
    details['category'] = 20
    
    # 2. Location (20%)
    loc_score = 0
    if lost_item.location_id == found.location_id:
        loc_score = 20
    elif lost_location and found_location and lost_location.building == found_location.building:
        loc_score = 10
    score += loc_score
    details['location'] = loc_score
    
    # 3. Date (15%)
    date_diff = (found.found_date - lost_item.lost_date).days
    date_score = 0
    if date_diff == 0:
        date_score = 15
    elif date_diff <= 2:
        date_score = 10
    elif date_diff <= 7:
        date_score = 5
    score += date_score
    details['date'] = date_score
    
    # 4. Time (10%)
    time_score = 0
    if lost_item.lost_time and found.found_time and date_diff == 0:
        # Calculate minute difference
        l_mins = lost_item.lost_time.hour * 60 + lost_item.lost_time.minute
        f_mins = found.found_time.hour * 60 + found.found_time.minute
        diff_mins = abs(f_mins - l_mins)
        if diff_mins <= 120:
            time_score = 10
        elif diff_mins <= 360:
            time_score = 5
    score += time_score
    details['time'] = time_score
    
    # 5. Color (10%)
    color_score = 0
    if lost_item.color and found.color and lost_item.color.strip().lower() == found.color.strip().lower():
        color_score = 10
    score += color_score
    details['color'] = color_score
    
    # 6. Brand (10%)
    brand_score = 0
    if lost_item.brand and found.brand and lost_item.brand.strip().lower() == found.brand.strip().lower():
        brand_score = 10
    score += brand_score
    details['brand'] = brand_score
    
    # 7. Description (10%)
    desc_score = 0
    if lost_item.description and found.description:
        l_tokens = set(lost_item.description.lower().split())
        f_tokens = set(found.description.lower().split())
        if l_tokens and f_tokens:
            intersection = l_tokens.intersection(f_tokens)
            overlap = len(intersection) / min(len(l_tokens), len(f_tokens))
            desc_score = int(overlap * 10)
    score += desc_score
    details['description'] = desc_score
    
    # 8. Unique Features (5%)
    unique_score = 0
    if lost_item.unique_features and found.unique_features:
        l_feat = set(lost_item.unique_features.lower().split())
        f_feat = set(found.unique_features.lower().split())
        if l_feat and f_feat and len(l_feat.intersection(f_feat)) > 0:
            unique_score = 5
    score += unique_score
    details['unique'] = unique_score
    
    return score, details

def generate_matches_for_lost_item(db: Session, lost_item: LostItem):
    """
    Finds potential found items for a reported lost item using a MySQL coarse filter 
    and a Python weighted similarity scoring engine.
    """
    min_date = lost_item.lost_date - timedelta(days=2)
    max_date = lost_item.lost_date + timedelta(days=30)
    
    # COARSE FILTER (MySQL): Same category, available or unclaimed, found in reasonable date window.
    candidates = db.query(FoundItem).filter(
        FoundItem.category_id == lost_item.category_id,
        FoundItem.status.in_(['AVAILABLE', 'UNCLAIMED']),
        FoundItem.found_date >= min_date,
        FoundItem.found_date <= max_date
    ).all()
    
    new_matches = []
    lost_location = db.query(Location).filter(Location.id == lost_item.location_id).first()
    
    # Get location mapping for candidates efficiently
    candidate_location_ids = {c.location_id for c in candidates}
    locations = db.query(Location).filter(Location.id.in_(candidate_location_ids)).all()
    location_map = {loc.id: loc for loc in locations}
    
    highest_score = 0
    
    for found in candidates:
        # Prevent duplicate match entries
        existing_match = db.query(Match).filter(
            Match.lost_item_id == lost_item.id,
            Match.found_item_id == found.id
        ).first()
        
        if existing_match:
            continue
            
        found_location = location_map.get(found.location_id)
        
        # FINE-GRAINED SCORING (Python)
        score, details = calculate_match_score(lost_item, found, lost_location, found_location)
        
        # Threshold: Save matches >= 50
        if score >= 50:
            new_match = Match(
                lost_item_id=lost_item.id,
                found_item_id=found.id,
                match_score=score,
                matching_details=details,
                status="SUGGESTED"
            )
            db.add(new_match)
            new_matches.append(new_match)
            if score > highest_score:
                highest_score = score
            
    # Update lost item status if a strong match is found
    if highest_score >= 70 and lost_item.status == 'ACTIVE':
        lost_item.status = 'MATCHED'
        
    db.commit()
    for m in new_matches:
        db.refresh(m)
        
    return new_matches


def generate_matches_for_found_item(db: Session, found_item: FoundItem):
    """
    Finds potential lost items when a new found item is reported.
    """
    min_date = found_item.found_date - timedelta(days=30)
    max_date = found_item.found_date + timedelta(days=2)
    
    candidates = db.query(LostItem).filter(
        LostItem.category_id == found_item.category_id,
        LostItem.status.in_(['ACTIVE', 'MATCHED']),
        LostItem.lost_date >= min_date,
        LostItem.lost_date <= max_date
    ).all()
    
    new_matches = []
    found_location = db.query(Location).filter(Location.id == found_item.location_id).first()
    
    candidate_location_ids = {c.location_id for c in candidates}
    locations = db.query(Location).filter(Location.id.in_(candidate_location_ids)).all()
    location_map = {loc.id: loc for loc in locations}
    
    highest_score = 0
    
    for lost in candidates:
        existing_match = db.query(Match).filter(
            Match.lost_item_id == lost.id,
            Match.found_item_id == found_item.id
        ).first()
        
        if existing_match:
            continue
            
        lost_location = location_map.get(lost.location_id)
        score, details = calculate_match_score(lost, found_item, lost_location, found_location)
        
        if score >= 50:
            new_match = Match(
                lost_item_id=lost.id,
                found_item_id=found_item.id,
                match_score=score,
                matching_details=details,
                status="SUGGESTED"
            )
            db.add(new_match)
            new_matches.append(new_match)
            if score > highest_score:
                highest_score = score
            if score >= 70 and lost.status == 'ACTIVE':
                lost.status = 'MATCHED'
                
    db.commit()
    for m in new_matches:
        db.refresh(m)
        
    return new_matches

