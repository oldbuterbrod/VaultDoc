from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
def auth_ping():
    return {"module": "auth"}
