from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.dataset_store import get_active_dataset
from app.services.analysis_engine import analysis_payload, check_data, chart_payload, simple_insights, filtered_rows

router=APIRouter(prefix="/analytics",tags=["Analisis faktor risiko dan KPI"])

@router.get("/overview")
def overview(
    kecamatan: Optional[str]=Query(None), puskesmas: Optional[str]=Query(None),
    desa_kelurahan: Optional[str]=Query(None), jenis_kelamin: Optional[str]=Query(None),
    age_group: Optional[str]=Query(None),status_stunting: Optional[str]=Query(None),
    periode: Optional[str]=Query(None),
):
    active=get_active_dataset()
    if not active:
        raise HTTPException(status_code=409,detail="Belum ada dataset aktif. Unggah dataset terlebih dahulu.")
    # JANGAN pakai locals(): variabel 'active' berisi seluruh dataset dan
    # tidak boleh masuk ke respons API, bahkan sebagai metadata filter.
    filters={k:v for k,v in {
        "kecamatan":kecamatan,"puskesmas":puskesmas,"desa_kelurahan":desa_kelurahan,
        "jenis_kelamin":jenis_kelamin,"age_group":age_group,
        "status_stunting":status_stunting,"periode":periode,
    }.items() if v is not None}
    return analysis_payload(active["rows"],active["column_mapping"],filters)

@router.get("/quality-check")
def quality_check():
    active=get_active_dataset()
    if not active:raise HTTPException(status_code=409,detail="Belum ada dataset aktif.")
    return check_data(active["rows"],active["column_mapping"])


@router.get("/charts")
def charts(kecamatan:Optional[str]=Query(None),jenis_kelamin:Optional[str]=Query(None),age_group:Optional[str]=Query(None)):
    active=get_active_dataset()
    if not active:raise HTTPException(409,"Belum ada dataset aktif.")
    return chart_payload(active["rows"],active["column_mapping"],{"kecamatan":kecamatan,"jenis_kelamin":jenis_kelamin,"age_group":age_group})

@router.get("/insights")
def insights(kecamatan:Optional[str]=Query(None),jenis_kelamin:Optional[str]=Query(None)):
    active=get_active_dataset()
    if not active:raise HTTPException(409,"Belum ada dataset aktif.")
    return {"insights":simple_insights(active["rows"],active["column_mapping"],{"kecamatan":kecamatan,"jenis_kelamin":jenis_kelamin})}
