"""
Skema Pydantic untuk endpoint Health Check.
Memastikan validasi tipe data dan dokumentasi OpenAPI yang rapi.
"""
from datetime import datetime, timezone
from pydantic import BaseModel, Field


def get_current_utc_time() -> datetime:
    """Mengembalikan waktu saat ini dalam timezone UTC yang sadar-zona (timezone-aware)."""
    return datetime.now(timezone.utc)


class HealthResponse(BaseModel):
    status: str = Field(
        ...,
        description="Status kesehatan backend (contoh: 'ok')",
        examples=["ok"]
    )
    message: str = Field(
        ...,
        description="Pesan deskriptif status backend",
        examples=["Backend Stunting Toba aktif dan siap digunakan"]
    )
    version: str = Field(
        ...,
        description="Versi aplikasi backend",
        examples=["1.0.0"]
    )
    timestamp: datetime = Field(
        default_factory=get_current_utc_time,
        description="Waktu server dalam format UTC (ISO-8601)"
    )
