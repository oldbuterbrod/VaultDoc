from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
def folders_ping():
    return {"module": "folders"}
