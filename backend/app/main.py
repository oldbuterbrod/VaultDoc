from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.folders import router as folders_router
from app.api.documents import router as documents_router
from app.api.permissions import router as permissions_router
from app.core.config import settings
from app.api.audit import router as audit_router

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # потом сузим
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(folders_router, prefix="/api/folders", tags=["folders"])
app.include_router(documents_router, prefix="/api/documents", tags=["documents"])
app.include_router(permissions_router, prefix="/api/permissions", tags=["permissions"])
app.include_router(audit_router, prefix="/api/audit", tags=["audit"])