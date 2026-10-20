from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.models import Claim, Match, FoundItem, Verification, User, AuditLog
from app.schemas.claim import ClaimCreate, ClaimResponse, VerificationCreate, HandoverCreate
from app.api.dependencies import get_current_user, get_staff_user
from app.services.approval_service import approve_claim_transaction

router = APIRouter()

@router.post("/claims", response_model=ClaimResponse, status_code=201)
def submit_claim(
    claim_data: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    match = db.query(Match).filter(Match.id == claim_data.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    existing_claim = db.query(Claim).filter(
        Claim.match_id == match.id,
        Claim.claimant_id == current_user.id,
        Claim.status == "PENDING"
    ).first()
    if existing_claim:
        raise HTTPException(status_code=400, detail="You already have an active claim for this match")

    new_claim = Claim(
        match_id=match.id,
        claimant_id=current_user.id,
        proof_details=claim_data.proof_details,
        status="PENDING"
    )
    db.add(new_claim)

    match.status = "UNDER_REVIEW"

    found = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
    if found and found.status == "AVAILABLE":
        found.status = "CLAIMED"

    db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        entity_type="CLAIM",
        entity_id=new_claim.id,
        action="SUBMIT_CLAIM",
        new_status="PENDING",
        details={"match_id": match.id}
    ))

    db.commit()
    db.refresh(new_claim)
    # Eager-load match + related items
    claim = db.query(Claim).options(
        joinedload(Claim.match).joinedload(Match.found_item),
        joinedload(Claim.match).joinedload(Match.lost_item),
    ).filter(Claim.id == new_claim.id).first()
    return claim


@router.get("/claims", response_model=List[ClaimResponse])
def get_claims(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200)
):
    query = db.query(Claim).options(
        joinedload(Claim.match).joinedload(Match.found_item),
        joinedload(Claim.match).joinedload(Match.lost_item),
    )

    # Students see only their own claims; Staff/Admin see all
    if current_user.role == "STUDENT":
        query = query.filter(Claim.claimant_id == current_user.id)

    if status:
        query = query.filter(Claim.status == status)

    return query.order_by(Claim.submitted_at.desc()).offset(skip).limit(limit).all()


@router.post("/claims/{claim_id}/verify")
def verify_claim(
    claim_id: int,
    verif_data: VerificationCreate,
    db: Session = Depends(get_db),
    staff_user: User = Depends(get_staff_user)
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status != "PENDING":
        raise HTTPException(status_code=400, detail="Claim is not PENDING")

    existing_verif = db.query(Verification).filter(Verification.claim_id == claim.id).first()
    if existing_verif:
        raise HTTPException(status_code=400, detail="Verification already recorded for this claim")

    # MySQL constraint chk_verification_result allows ('VALID', 'INVALID')
    normalized_result = "VALID" if verif_data.result in ["VALID", "VERIFIED"] else "INVALID"

    verif = Verification(
        claim_id=claim.id,
        verifier_id=staff_user.id,
        verification_notes=verif_data.verification_notes,
        result=normalized_result
    )
    db.add(verif)

    db.add(AuditLog(
        user_id=staff_user.id,
        entity_type="VERIFICATION",
        entity_id=claim.id,
        action="VERIFY_CLAIM",
        details={"result": verif_data.result}
    ))

    db.commit()
    return {"message": "Verification recorded"}


@router.post("/claims/{claim_id}/approve")
def approve_claim(
    claim_id: int,
    handover_data: HandoverCreate,
    db: Session = Depends(get_db),
    staff_user: User = Depends(get_staff_user)
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.claimant_id == staff_user.id:
        raise HTTPException(status_code=403, detail="You cannot approve your own claim")

    approve_claim_transaction(
        db=db,
        claim_id=claim_id,
        staff_id=staff_user.id,
        handover_data=handover_data.model_dump()
    )
    return {"message": "Claim approved, item marked RETURNED, lost item marked RECOVERED, handover logged."}


@router.post("/claims/{claim_id}/reject")
def reject_claim(
    claim_id: int,
    db: Session = Depends(get_db),
    staff_user: User = Depends(get_staff_user)
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status != "PENDING":
        raise HTTPException(status_code=400, detail="Only PENDING claims can be rejected")

    old_status = claim.status
    claim.status = "REJECTED"

    # Revert match and found item if no other pending claims
    match = db.query(Match).filter(Match.id == claim.match_id).first()
    if match:
        other_pending = db.query(Claim).filter(
            Claim.match_id == match.id,
            Claim.id != claim.id,
            Claim.status == "PENDING"
        ).first()
        if not other_pending:
            match.status = "SUGGESTED"
            found = db.query(FoundItem).filter(FoundItem.id == match.found_item_id).first()
            if found and found.status == "CLAIMED":
                found.status = "AVAILABLE"

    db.add(AuditLog(
        user_id=staff_user.id,
        entity_type="CLAIM",
        entity_id=claim.id,
        action="REJECT_CLAIM",
        old_status=old_status,
        new_status="REJECTED",
        details={"rejected_by": staff_user.id}
    ))

    db.commit()
    return {"message": "Claim rejected. Found item marked available again."}
