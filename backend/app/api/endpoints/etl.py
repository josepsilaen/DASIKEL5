
"""Pratinjau ETL, penerapan transformasi, audit, dan ekspor terdeidentifikasi."""
from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services import analysis_engine as engine
from app.services.data_parser import classify_pii_column, inspect_dataset
from app.services.dataset_store import get_active_dataset
from app.services.etl_service import transform_dataset

router = APIRouter(prefix="/data/etl", tags=["ETL dan ekspor"])


class ApplyRequest(BaseModel):
    setuju: bool = False


def _dataset():
    dataset = get_active_dataset()
    if not dataset:
        raise HTTPException(409, "Unggah dataset terlebih dahulu.")
    return dataset


@router.get("/preview")
def preview():
    dataset = _dataset()
    _, audit = transform_dataset(dataset["rows"], dataset["column_mapping"])
    return {
        "audit": audit,
        "belum_diterapkan": True,
        "pesan": "Pratinjau tidak mengubah data. Terapkan ETL setelah menyetujui.",
    }


@router.post("/apply")
def apply(request: ApplyRequest):
    if not request.setuju:
        raise HTTPException(422, "Persetujuan setuju=true diperlukan.")
    dataset = _dataset()

    result, audit = transform_dataset(dataset["rows"], dataset["column_mapping"])
    if "original_rows" not in dataset:
        dataset["original_rows"] = [row.copy() for row in dataset["rows"]]

    # Ukuran sumber harus dicatat sebelum preview_response diganti.
    source_size = dataset.setdefault(
        "original_file_size_bytes", dataset["preview_response"].file_size_bytes
    )
    new_preview = inspect_dataset(
        filename=dataset["filename"],
        file_type=dataset["file_type"],
        file_size_bytes=source_size,
        headers=dataset["headers"],
        rows=result,
    )
    dataset["rows"] = result
    dataset["preview_response"] = new_preview

    from app.services.ml_service import TRAIN_STATE
    TRAIN_STATE.clear()
    dataset.setdefault("etl_audit", []).append(audit)
    return {
        "diterapkan": True,
        "audit": audit,
        "riwayat_eksekusi": len(dataset["etl_audit"]),
    }


@router.get("/audit")
def audit():
    dataset = _dataset()
    history = dataset.get("etl_audit", [])
    return {"riwayat": history, "sudah_di_etl": bool(history)}


BLOCKED = {
    "record_id", "id_anak", "id_balita", "nik", "nama", "nama_balita",
    "nama_lengkap", "alamat", "no_hp", "tanggal_lahir", "tanggal_ukur",
    "tanggal_pengukuran", "desa_kel", "desa_kelurahan", "desa", "puskesmas",
    "posyandu", "nomor_kk", "no_kk", "nomor_telepon",
}


def _month(value) -> str:
    raw = str(value or "").strip()
    for pattern in ("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, pattern).strftime("%Y-%m")
        except ValueError:
            continue
    return ""


def _excel_safe(value) -> str:
    text = str(value or "")
    if text.lstrip().startswith(("=", "+", "@")) or (
        text.lstrip().startswith("-") and engine.number(text) is None
    ):
        return "'" + text
    return text


@router.get("/export.csv")
def export_csv():
    dataset = _dataset()
    mapping = dataset.get("column_mapping", {})

    columns = [
        (source, target)
        for source, target in mapping.items()
        if source in dataset["headers"]
        and source.strip().lower() not in BLOCKED
        and target.strip().lower() not in BLOCKED
        and not classify_pii_column(source)[0]
    ]
    if not columns:
        raise HTTPException(422, "Tidak ada kolom yang dapat diekspor.")

    date_source = next(
        (source for source, target in mapping.items() if target == "tanggal_ukur"),
        None,
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [target for _, target in columns]
        + (["periode_pengukuran"] if date_source else [])
    )
    for row in dataset["rows"]:
        values = [_excel_safe(row.get(source, "")) for source, _ in columns]
        if date_source:
            values.append(_month(row.get(date_source)))
        writer.writerow(values)

    content = output.getvalue().encode("utf-8-sig")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                "attachment; filename=stunting_dataset_terdeidentifikasi.csv"
            ),
            "Cache-Control": "no-store",
        },
    )
