from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
def documents_ping():
    return {"module": "documents"}
