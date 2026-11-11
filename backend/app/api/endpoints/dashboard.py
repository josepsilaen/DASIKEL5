"""
Router API untuk Dashboard Utama Stunting Toba.
Menyediakan endpoint agregasi data aktual berdasarkan dataset balita yang aktif.
"""
from typing import Optional
from fastapi import APIRouter, Query
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dataset_store import compute_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["Dashboard Utama"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Ringkasan statistik aktual Dashboard Utama",
    description=(
        "Mengembalikan agregasi KPI ringkasan, distribusi antropometri aktual, tren bulanan, "
        "analisis lima bagian visualisasi Tableau, dan pratinjau baris data balita tersamar berdasarkan dataset aktif."
    ),
)
def get_dashboard_summary(
    desa_kelurahan: Optional[str] = Query(None, description="Filter desa aktif untuk interaksi visualisasi Tableau")
) -> DashboardSummaryResponse:
    return compute_dashboard_summary(desa_filter=desa_kelurahan)

