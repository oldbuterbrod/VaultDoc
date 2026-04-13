from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
def users_ping():
    return {"module": "users"}
