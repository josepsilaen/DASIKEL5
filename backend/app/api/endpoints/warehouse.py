
"""API pembangunan dan status warehouse."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import warehouse_service
from app.services.dataset_store import get_active_dataset

router = APIRouter(prefix="/warehouse", tags=["Data warehouse dimensional"])


class BuildRequest(BaseModel):
    setuju: bool = False


@router.post("/build")
def build(request: BuildRequest):
    if not request.setuju:
        raise HTTPException(422, "Bangun warehouse memerlukan setuju=true.")
    dataset = get_active_dataset()
    if not dataset:
        raise HTTPException(409, "Upload dataset terlebih dahulu.")
    return {
        "dibangun": True,
        "jumlah": warehouse_service.build(
            dataset["rows"], dataset["column_mapping"]
        ),
    }


@router.get("/stats")
def stats():
    dataset = get_active_dataset()
    return warehouse_service.stats(
        dataset["rows"] if dataset else None,
        dataset["column_mapping"] if dataset else None,
    )
