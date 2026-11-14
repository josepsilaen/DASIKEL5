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
    desa_kelurahan: Optional[str] = Query(None, description="Filter desa"),
    kecamatan: Optional[str] = Query(None),
    puskesmas: Optional[str] = Query(None),
    jenis_kelamin: Optional[str] = Query(None),
    age_group: Optional[str] = Query(None),
    status_stunting: Optional[str] = Query(None),
    periode: Optional[str] = Query(None),
) -> DashboardSummaryResponse:
    return compute_dashboard_summary(desa_filter=desa_kelurahan,
        kecamatan=kecamatan,puskesmas=puskesmas,jenis_kelamin=jenis_kelamin,
        age_group=age_group,status_stunting=status_stunting,periode=periode)

