from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models.models import AuditLog, User, LostItem, FoundItem, Claim, Match, Handover, Category, Location
from app.api.dependencies import get_current_user, get_admin_user, get_staff_user
from app.auth.security import get_password_hash

router = APIRouter()

# --- Request Schemas for Admin User Operations ---
class AdminUserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "STUDENT"  # STUDENT, STAFF, ADMIN
    phone: Optional[str] = None

class AdminUserStatusUpdate(BaseModel):
    is_active: bool

class AdminUserRoleUpdate(BaseModel):
    role: str


# --- System Statistics (Accessible to both STAFF & ADMIN for Overviews) ---
@router.get("/stats")
def get_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    # Total Users & Role Breakdown
    total_users = db.query(func.count(User.id)).scalar() or 0
    students_count = db.query(func.count(User.id)).filter(User.role == 'STUDENT').scalar() or 0
    staff_count = db.query(func.count(User.id)).filter(User.role == 'STAFF').scalar() or 0
    admins_count = db.query(func.count(User.id)).filter(User.role == 'ADMIN').scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0

    # Lost Items Breakdown
    lost_active = db.query(func.count(LostItem.id)).filter(LostItem.status == 'ACTIVE').scalar() or 0
    lost_matched = db.query(func.count(LostItem.id)).filter(LostItem.status == 'MATCHED').scalar() or 0
    lost_recovered = db.query(func.count(LostItem.id)).filter(LostItem.status == 'RECOVERED').scalar() or 0
    total_lost = db.query(func.count(LostItem.id)).scalar() or 0

    # Found Items Breakdown
    found_available = db.query(func.count(FoundItem.id)).filter(FoundItem.status == 'AVAILABLE').scalar() or 0
    found_claimed = db.query(func.count(FoundItem.id)).filter(FoundItem.status == 'CLAIMED').scalar() or 0
    found_returned = db.query(func.count(FoundItem.id)).filter(FoundItem.status == 'RETURNED').scalar() or 0
    total_found = db.query(func.count(FoundItem.id)).scalar() or 0

    # Claims Breakdown
    claims_pending = db.query(func.count(Claim.id)).filter(Claim.status == 'PENDING').scalar() or 0
    claims_approved = db.query(func.count(Claim.id)).filter(Claim.status == 'APPROVED').scalar() or 0
    claims_rejected = db.query(func.count(Claim.id)).filter(Claim.status == 'REJECTED').scalar() or 0
    total_claims = db.query(func.count(Claim.id)).scalar() or 0

    # Handovers
    total_handovers = db.query(func.count(Handover.id)).scalar() or 0

    # Performance
    recovery_rate = (lost_recovered / total_lost * 100) if total_lost > 0 else 0

    # Category Breakdown (Lost + Found counts)
    categories = db.query(Category).all()
    category_stats = []
    for cat in categories:
        l_cnt = db.query(func.count(LostItem.id)).filter(LostItem.category_id == cat.id).scalar() or 0
        f_cnt = db.query(func.count(FoundItem.id)).filter(FoundItem.category_id == cat.id).scalar() or 0
        category_stats.append({
            "id": cat.id,
            "name": cat.name,
            "lost_count": l_cnt,
            "found_count": f_cnt,
            "total_count": l_cnt + f_cnt
        })

    # Location Breakdown
    locations = db.query(Location).all()
    location_stats = []
    for loc in locations:
        l_cnt = db.query(func.count(LostItem.id)).filter(LostItem.location_id == loc.id).scalar() or 0
        f_cnt = db.query(func.count(FoundItem.id)).filter(FoundItem.location_id == loc.id).scalar() or 0
        location_stats.append({
            "id": loc.id,
            "name": loc.name,
            "building": loc.building,
            "total_items": l_cnt + f_cnt
        })

    # Recent 10 audit logs
    recent_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
    recent_activity = []
    for log in recent_logs:
        user = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        recent_activity.append({
            "id": log.id,
            "user_name": user.name if user else "System Automated",
            "user_role": user.role if user else "SYSTEM",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_status": log.old_status,
            "new_status": log.new_status,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })

    return {
        "users": {
            "total": total_users,
            "students": students_count,
            "staff": staff_count,
            "admins": admins_count,
            "active": active_users,
            "inactive": total_users - active_users
        },
        "lost_items": {
            "total": total_lost,
            "active": lost_active,
            "matched": lost_matched,
            "recovered": lost_recovered
        },
        "found_items": {
            "total": total_found,
            "available": found_available,
            "claimed": found_claimed,
            "returned": found_returned
        },
        "claims": {
            "total": total_claims,
            "pending": claims_pending,
            "approved": claims_approved,
            "rejected": claims_rejected
        },
        "performance": {
            "recovery_rate_percentage": round(recovery_rate, 2),
            "total_handovers": total_handovers
        },
        "category_breakdown": category_stats,
        "location_breakdown": location_stats,
        "recent_activity": recent_activity
    }


# --- User Management (Admin Only) ---
@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_admin_user)
):
    query = db.query(User)

    if search:
        s = f"%{search}%"
        query = query.filter(or_(User.name.ilike(s), User.email.ilike(s), User.phone.ilike(s)))

    if role and role != "ALL":
        query = query.filter(User.role == role)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total_count = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    for u in users:
        lost_c = db.query(func.count(LostItem.id)).filter(LostItem.user_id == u.id).scalar() or 0
        found_c = db.query(func.count(FoundItem.id)).filter(FoundItem.user_id == u.id).scalar() or 0
        claim_c = db.query(func.count(Claim.id)).filter(Claim.claimant_id == u.id).scalar() or 0

        results.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "phone": u.phone or "—",
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "lost_count": lost_c,
            "found_count": found_c,
            "claims_count": claim_c
        })

    return {
        "total": total_count,
        "users": results
    }


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    # Check duplicate email
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if user_in.role not in ["STUDENT", "STAFF", "ADMIN"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        phone=user_in.phone,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        entity_type="USER",
        entity_id=new_user.id,
        action="CREATE_USER_BY_ADMIN",
        new_status="ACTIVE",
        details={"name": new_user.name, "email": new_user.email, "role": new_user.role}
    ))

    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "phone": new_user.phone,
        "is_active": new_user.is_active,
        "created_at": new_user.created_at.isoformat() if new_user.created_at else None
    }


@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    status_in: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.id == current_user.id and not status_in.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    old_status = "ACTIVE" if target_user.is_active else "INACTIVE"
    target_user.is_active = status_in.is_active
    new_status = "ACTIVE" if target_user.is_active else "INACTIVE"

    db.add(AuditLog(
        user_id=current_user.id,
        entity_type="USER",
        entity_id=target_user.id,
        action="UPDATE_USER_STATUS",
        old_status=old_status,
        new_status=new_status,
        details={"email": target_user.email}
    ))

    db.commit()
    return {"message": f"User status successfully updated to {new_status}", "is_active": target_user.is_active}


@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: int,
    role_in: AdminUserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if role_in.role not in ["STUDENT", "STAFF", "ADMIN"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    if target_user.id == current_user.id and role_in.role != "ADMIN":
        raise HTTPException(status_code=400, detail="You cannot revoke your own admin role")

    old_role = target_user.role
    target_user.role = role_in.role

    db.add(AuditLog(
        user_id=current_user.id,
        entity_type="USER",
        entity_id=target_user.id,
        action="CHANGE_USER_ROLE",
        old_status=old_role,
        new_status=target_user.role,
        details={"email": target_user.email}
    ))

    db.commit()
    return {"message": f"User role changed from {old_role} to {target_user.role}", "role": target_user.role}


# --- Completed Handovers (Staff & Admin) ---
@router.get("/handovers")
def get_handovers(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_staff_user)
):
    handovers = db.query(Handover).options(
        joinedload(Handover.claim).joinedload(Claim.claimant),
        joinedload(Handover.claim).joinedload(Claim.match).joinedload(Match.found_item),
        joinedload(Handover.claim).joinedload(Claim.match).joinedload(Match.lost_item),
        joinedload(Handover.staff)
    ).order_by(Handover.handover_time.desc()).offset(skip).limit(limit).all()

    results = []
    for h in handovers:
        claimant = h.claim.claimant if h.claim else None
        found_item = h.claim.match.found_item if (h.claim and h.claim.match) else None
        lost_item = h.claim.match.lost_item if (h.claim and h.claim.match) else None

        results.append({
            "id": h.id,
            "claim_id": h.claim_id,
            "staff_id": h.staff_id,
            "staff_name": h.staff.name if h.staff else "Unknown Staff",
            "staff_email": h.staff.email if h.staff else "",
            "claimant_name": claimant.name if claimant else "Unknown Claimant",
            "claimant_email": claimant.email if claimant else "",
            "item_title": found_item.title if found_item else (lost_item.title if lost_item else "Unknown Item"),
            "handover_location": h.handover_location,
            "handover_time": h.handover_time.isoformat() if h.handover_time else None,
            "notes": h.notes or "—"
        })

    return results


# --- Unified Campus Item Catalog (Students, Staff & Admin) ---
@router.get("/all-items")
def get_all_items(
    db: Session = Depends(get_db),
    item_type: Optional[str] = "ALL",  # ALL, LOST, FOUND
    status: Optional[str] = None,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    location_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    items_list = []

    # Query Lost items if requested
    if item_type in ["ALL", "LOST"]:
        q_lost = db.query(LostItem).options(
            joinedload(LostItem.category),
            joinedload(LostItem.location),
            joinedload(LostItem.user)
        )
        if status:
            q_lost = q_lost.filter(LostItem.status == status)
        if category_id:
            q_lost = q_lost.filter(LostItem.category_id == category_id)
        if location_id:
            q_lost = q_lost.filter(LostItem.location_id == location_id)
        if search:
            s = f"%{search}%"
            q_lost = q_lost.filter(or_(LostItem.title.ilike(s), LostItem.description.ilike(s), LostItem.brand.ilike(s), LostItem.color.ilike(s)))

        for li in q_lost.order_by(LostItem.created_at.desc()).offset(skip).limit(limit).all():
            items_list.append({
                "type": "LOST",
                "id": li.id,
                "title": li.title,
                "description": li.description,
                "color": li.color or "—",
                "brand": li.brand or "—",
                "status": li.status,
                "category": li.category.name if li.category else "—",
                "location": f"{li.location.name} ({li.location.building})" if li.location else "—",
                "reported_by": li.user.name if li.user else "Anonymous",
                "reporter_email": li.user.email if li.user else "",
                "date": str(li.lost_date),
                "created_at": li.created_at.isoformat() if li.created_at else None
            })

    # Query Found items if requested
    if item_type in ["ALL", "FOUND"]:
        q_found = db.query(FoundItem).options(
            joinedload(FoundItem.category),
            joinedload(FoundItem.location),
            joinedload(FoundItem.user)
        )
        if status:
            q_found = q_found.filter(FoundItem.status == status)
        if category_id:
            q_found = q_found.filter(FoundItem.category_id == category_id)
        if location_id:
            q_found = q_found.filter(FoundItem.location_id == location_id)
        if search:
            s = f"%{search}%"
            q_found = q_found.filter(or_(FoundItem.title.ilike(s), FoundItem.description.ilike(s), FoundItem.brand.ilike(s), FoundItem.color.ilike(s)))

        for fi in q_found.order_by(FoundItem.created_at.desc()).offset(skip).limit(limit).all():
            items_list.append({
                "type": "FOUND",
                "id": fi.id,
                "title": fi.title,
                "description": fi.description,
                "color": fi.color or "—",
                "brand": fi.brand or "—",
                "status": fi.status,
                "category": fi.category.name if fi.category else "—",
                "location": f"{fi.location.name} ({fi.location.building})" if fi.location else "—",
                "reported_by": fi.user.name if fi.user else "Anonymous",
                "reporter_email": fi.user.email if fi.user else "",
                "date": str(fi.found_date),
                "created_at": fi.created_at.isoformat() if fi.created_at else None
            })

    # Sort combined items by created_at desc
    items_list.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return items_list[:limit]


# --- Audit Logs (Staff & Admin) ---
@router.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_staff_user)
):
    query = db.query(AuditLog)

    if action and action != "ALL":
        query = query.filter(AuditLog.action == action)
    if entity_type and entity_type != "ALL":
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for log in logs:
        u = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_name": u.name if u else "System Automated",
            "user_email": u.email if u else "—",
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "old_status": log.old_status,
            "new_status": log.new_status,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    return result
