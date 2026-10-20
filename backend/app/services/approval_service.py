from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import Claim, Match, FoundItem, LostItem, Handover, AuditLog
from datetime import datetime

def approve_claim_transaction(
    db: Session, 
    claim_id: int, 
    staff_id: int, 
    handover_data: dict
):
    """
    Approves a claim using a transaction-safe row-level locking mechanism
    to prevent concurrent/competing approvals.
    """
    try:
        # 1. Lock the Claim
        claim = db.query(Claim).with_for_update().filter(Claim.id == claim_id).first()
        if not claim:
            raise HTTPException(status_code=404, detail="Claim not found")
            
        if claim.status != 'PENDING':
            raise HTTPException(status_code=400, detail="Claim is not in PENDING state")
            
        # 2. Lock the Match to get the Items
        match = db.query(Match).with_for_update().filter(Match.id == claim.match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail="Associated match not found")
            
        # 3. Lock Found and Lost Items
        found_item = db.query(FoundItem).with_for_update().filter(FoundItem.id == match.found_item_id).first()
        lost_item = db.query(LostItem).with_for_update().filter(LostItem.id == match.lost_item_id).first()
        
        if found_item.status not in ('AVAILABLE', 'CLAIMED'):
            raise HTTPException(status_code=400, detail="Found item is no longer available")
            
        if lost_item.status not in ('ACTIVE', 'MATCHED'):
            raise HTTPException(status_code=400, detail="Lost item is no longer active")
            
        # 4. Perform the updates
        claim.status = 'APPROVED'
        claim.reviewed_at = datetime.utcnow()
        claim.reviewed_by = staff_id
        
        match.status = 'CONFIRMED'
        
        # Save old statuses for audit log
        old_found_status = found_item.status
        old_lost_status = lost_item.status
        
        found_item.status = 'RETURNED'
        lost_item.status = 'RECOVERED'
        
        # 5. Reject competing claims for the same found item
        competing_claims = db.query(Claim).join(Match).filter(
            Match.found_item_id == found_item.id,
            Claim.id != claim.id,
            Claim.status == 'PENDING'
        ).all()
        
        for comp_claim in competing_claims:
            comp_claim.status = 'REJECTED'
            
            db.add(AuditLog(
                user_id=staff_id,
                entity_type='CLAIM',
                entity_id=comp_claim.id,
                action='REJECT_COMPETING_CLAIM',
                old_status='PENDING',
                new_status='REJECTED'
            ))
            
        # 6. Create Handover Record
        handover = Handover(
            claim_id=claim.id,
            staff_id=staff_id,
            handover_location=handover_data['handover_location'],
            handover_time=datetime.utcnow(),
            notes=handover_data.get('notes')
        )
        db.add(handover)
        
        # 7. Create Audit Logs
        db.add(AuditLog(
            user_id=staff_id,
            entity_type='CLAIM',
            entity_id=claim.id,
            action='APPROVE_CLAIM',
            old_status='PENDING',
            new_status='APPROVED'
        ))
        
        db.add(AuditLog(
            user_id=staff_id,
            entity_type='FOUND_ITEM',
            entity_id=found_item.id,
            action='UPDATE_STATUS',
            old_status=old_found_status,
            new_status='RETURNED'
        ))
        
        db.add(AuditLog(
            user_id=staff_id,
            entity_type='LOST_ITEM',
            entity_id=lost_item.id,
            action='UPDATE_STATUS',
            old_status=old_lost_status,
            new_status='RECOVERED'
        ))
        
        # Execute commit
        db.commit()
        return claim
        
    except Exception as e:
        db.rollback()
        raise e
