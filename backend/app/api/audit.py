from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.audit import AuditLogRead

router = APIRouter()


@router.get("/", response_model=list[AuditLogRead])
def list_audit_log(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Журнал аудита доступен только администратору",
        )

    return (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )