"""
Router API untuk Fitur Manajemen Data Balita.
Menyediakan endpoint unggah & preview dataset, validasi pemetaan kolom,
serta daftar referensi kolom standar antropometri.
"""
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import List, Optional

from app.schemas.data_management import (
    DatasetPreviewResponse,
    ValidateMappingRequest,
    ValidateMappingResponse,
    StandardColumnDefinition,
)
from app.services.data_parser import (
    MAX_FILE_SIZE_BYTES,
    STANDARD_COLUMNS,
    parse_csv_content,
    parse_csv_content_with_meta,
    parse_excel_content,
    inspect_dataset,
    validate_custom_mapping,
)
from app.services.dataset_store import (
    set_active_dataset,
    get_active_dataset,
    update_active_mapping,
    clear_active_dataset,
)

router = APIRouter(prefix="/data", tags=["Manajemen Data Balita"])


@router.get(
    "/standard-columns",
    response_model=List[StandardColumnDefinition],
    summary="Daftar kolom standar acuan",
    description="Mengembalikan seluruh definisi kolom standar aplikasi beserta kategori, satuan, dan alias.",
)
def get_standard_columns():
    return STANDARD_COLUMNS


@router.post(
    "/upload-preview",
    response_model=DatasetPreviewResponse,
    summary="Unggah dan pratinjau dataset balita",
    description=(
        "Menerima file CSV atau Excel (.xlsx), membaca struktur baris dan kolom, "
        "melakukan profiling kualitas data (duplikasi, nilai kosong, rentang nilai), "
        "serta mengembalikan pratinjau data dengan nilai identitas pribadi tersamar."
    ),
)
async def upload_dataset_preview(file: UploadFile = File(...)) -> DatasetPreviewResponse:
    filename = file.filename or "unknown"
    _, ext = os.path.splitext(filename.lower())

    if ext not in [".csv", ".xlsx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Format file '{ext}' tidak didukung. "
                "Sistem hanya mendukung berkas berformat .csv atau Excel .xlsx."
            ),
        )

    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal membaca berkas yang diunggah: {str(exc)}",
        )

    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File yang diunggah kosong tanpa isi (0 bytes).",
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ukuran berkas melebihi batas maksimum {max_mb} MB.",
        )

    file_type = "csv" if ext == ".csv" else "xlsx"
    is_reconstructed_fw = False

    try:
        if file_type == "csv":
            headers, rows, is_reconstructed_fw = parse_csv_content_with_meta(content)
        else:
            headers, rows = parse_excel_content(content)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Kesalahan saat memproses isi tabel. Pastikan struktur berkas sesuai standar.",
        )

    # Analisis dataset dan bentuk pratinjau
    preview_res = inspect_dataset(
        filename=filename,
        file_type=file_type,
        file_size_bytes=len(content),
        headers=headers,
        rows=rows,
        is_reconstructed_fixed_width=is_reconstructed_fw,
    )

    # Simpan dataset aktif ke memori backend untuk dipakai fitur Visualisasi & Analisis
    set_active_dataset(
        filename=filename,
        file_type=file_type,
        headers=headers,
        rows=rows,
        preview_response=preview_res,
    )

    return preview_res


@router.get(
    "/active-dataset",
    response_model=Optional[DatasetPreviewResponse],
    summary="Ambil status dataset balita aktif",
    description="Mengembalikan metadata dan pratinjau dataset balita yang saat ini tersimpan aktif di backend.",
)
def get_current_active_dataset() -> Optional[DatasetPreviewResponse]:
    active = get_active_dataset()
    if not active:
        return None
    return active.get("preview_response")


@router.delete(
    "/active-dataset",
    summary="Hapus dataset balita aktif",
    description="Mengosongkan dataset aktif dari memori backend.",
)
def delete_current_active_dataset():
    clear_active_dataset()
    return {"message": "Dataset aktif berhasil dibersihkan."}


@router.post(
    "/validate-mapping",
    response_model=ValidateMappingResponse,
    summary="Validasi penyesuaian pemetaan kolom",
    description="Mengevaluasi apakah pemetaan kolom yang dipilih pengguna memenuhi syarat analisis stunting.",
)
def validate_mapping(request: ValidateMappingRequest) -> ValidateMappingResponse:
    # Perbarui pemetaan pada dataset aktif
    update_active_mapping(request.column_mapping)
    return validate_custom_mapping(request.column_mapping)
