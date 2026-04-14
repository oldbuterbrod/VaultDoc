from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def write_audit(
    db: Session,
    request: Request | None,
    action: str,
    success: bool,
    actor_user_id: int | None = None,
    resource_type: str = "system",
    resource_id: int | None = None,
    resource_public_id=None,
    details: dict | None = None,
) -> None:
    ip_address = None
    user_agent = None

    if request is not None:
        if request.client:
            ip_address = request.client.host
        user_agent = request.headers.get("user-agent")

    event = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_public_id=resource_public_id,
        success=success,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details or {},
    )
    db.add(event)
    db.commit()