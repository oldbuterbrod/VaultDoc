from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
def permissions_ping():
    return {"module": "permissions"}
