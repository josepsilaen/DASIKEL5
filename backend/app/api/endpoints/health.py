"""
Endpoint pemeriksaan kesehatan (Health Check) backend Stunting Toba.
"""
from fastapi import APIRouter
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Periksa status backend",
    description="Mengembalikan status kesehatan backend Stunting Toba untuk memastikan server aktif."
)
def check_health() -> HealthResponse:
    """
    Handler untuk endpoint GET /api/health.
    Frontend memanggil endpoint ini untuk mengetahui konektivitas ke backend.
    """
    return HealthResponse(
        status="ok",
        message="Backend Stunting Toba aktif dan siap digunakan",
        version="1.0.0"
    )
