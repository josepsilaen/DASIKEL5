from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.schemas.visualization import (
    VisualizationFilterRequest,
    VisualizationResponse,
)
from app.services.dataset_store import compute_visualization, get_active_dataset
from app.services.data_parser import validate_mapping_against_headers

router = APIRouter(prefix="/visualization", tags=["Visualisasi Data Balita"])


@router.get(
    "",
    response_model=VisualizationResponse,
    summary="Ambil data visualisasi balita aktif",
    description=(
        "Mengembalikan agregasi statistik, distribusi status gizi (TB/U), "
        "komposisi jenis kelamin, dan distribusi wilayah berdasarkan filter query yang diberikan."
    ),
)
def get_visualization_data(
    kecamatan: Optional[str] = Query(None, description="Filter kecamatan"),
    puskesmas: Optional[str] = Query(None, description="Filter puskesmas"),
    desa_kelurahan: Optional[str] = Query(None, description="Filter desa/kelurahan"),
    jenis_kelamin: Optional[str] = Query(None, description="Filter jenis kelamin (L/P)"),
    age_group: Optional[str] = Query(None, description="Filter kelompok usia (misal: 0-5, 6-11, 12-23, 24-35, 36-47, 48-59, 60+)"),
    status_stunting: Optional[str] = Query(None, description="Filter status stunting (Stunting / Tidak Stunting)"),
    periode: Optional[str] = Query(None, description="Filter periode pengukuran"),
    region_type: Optional[str] = Query("puskesmas", description="Tipe wilayah: kecamatan, puskesmas, atau desa_kelurahan"),
) -> VisualizationResponse:
    filter_req = VisualizationFilterRequest(
        kecamatan=kecamatan,
        puskesmas=puskesmas,
        desa_kelurahan=desa_kelurahan,
        jenis_kelamin=jenis_kelamin,
        age_group=age_group,
        status_stunting=status_stunting,
        periode=periode,
        region_type=region_type,
    )
    return compute_visualization(filter_req)


@router.post(
    "",
    response_model=VisualizationResponse,
    summary="Ambil data visualisasi dengan payload filter",
    description="Menerima request filter dan pemetaan kolom kustom, mengembalikan agregasi visualisasi lengkap.",
)
def post_visualization_data(request: VisualizationFilterRequest) -> VisualizationResponse:
    if request.column_mapping is not None:
        active=get_active_dataset()
        if not active:
            raise HTTPException(409, "Belum ada dataset aktif.")
        validation=validate_mapping_against_headers(request.column_mapping,active["headers"])
        if not validation.is_valid:
            raise HTTPException(422, validation.readiness_message)
    return compute_visualization(request)
