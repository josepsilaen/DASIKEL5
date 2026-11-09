"""
Skema Pydantic untuk fitur Manajemen Data Balita.
Mencakup model untuk preview dataset, ringkasan kualitas data,
pemetaan kolom standar, dan status kesiapan analisis.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ColumnSummary(BaseModel):
    name: str = Field(..., description="Nama kolom asli dari file sumber")
    detected_type: str = Field(..., description="Tipe data terdeteksi (integer, float, string, date, boolean)")
    total_count: int = Field(..., description="Jumlah total baris yang dianalisis")
    null_count: int = Field(..., description="Jumlah nilai kosong/null")
    null_percentage: float = Field(..., description="Persentase nilai kosong terhadap total baris")
    sample_values: List[str] = Field(default_factory=list, description="Sampel nilai unik (tersamar jika PII)")
    is_pii: bool = Field(default=False, description="Apakah kolom terindikasi memuat data identitas pribadi")
    pii_status: Optional[str] = Field(default="safe", description="Status deteksi PII: 'confirmed', 'suspicious', atau 'safe'")
    pii_reason: Optional[str] = Field(default=None, description="Alasan deteksi PII atau perlunya pemeriksaan manual")
    suggested_mapping: Optional[str] = Field(default=None, description="Kandidat kolom standar aplikasi yang cocok")
    mapping_confidence: float = Field(default=0.0, description="Tingkat kecocokan kandidat pemetaan (0.0 - 1.0)")


class QualityIssue(BaseModel):
    issue_type: str = Field(..., description="Kategori isu (missing_values, duplicates, invalid_range, type_mismatch, unmapped, suspicious_pii)")
    severity: str = Field(..., description="Tingkat keparahan (error, warning, info)")
    column: Optional[str] = Field(default=None, description="Nama kolom terkait jika spesifik")
    message: str = Field(..., description="Penjelasan isu kualitas data yang ramah pengguna")
    affected_rows_count: int = Field(default=0, description="Estimasi jumlah baris yang terdampak")
    details: Optional[str] = Field(default=None, description="Rincian teknis atau saran tindakan")


class StandardColumnDefinition(BaseModel):
    key: str = Field(..., description="Kunci unik kolom standar aplikasi")
    label: str = Field(..., description="Label yang mudah dipahami")
    description: str = Field(..., description="Deskripsi makna dan kegunaan kolom")
    category: str = Field(..., description="Kategori kolom: core, administrative, clinical")
    is_required_for_stunting: bool = Field(..., description="Apakah kolom wajib untuk analisis stunting dasar")
    expected_type: str = Field(..., description="Tipe data yang diharapkan: integer, float, string, date")
    unit: Optional[str] = Field(default=None, description="Satuan pengukuran (contoh: bulan, kg, cm)")
    aliases: List[str] = Field(default_factory=list, description="Daftar nama variasi umum untuk pencocokan otomatis")


class DatasetPreviewResponse(BaseModel):
    filename: str = Field(..., description="Nama file yang diunggah")
    file_type: str = Field(..., description="Tipe file: csv atau xlsx")
    file_size_bytes: int = Field(..., description="Ukuran file dalam bytes")
    total_rows: int = Field(..., description="Jumlah total baris data yang terbaca")
    total_columns: int = Field(..., description="Jumlah kolom terdeteksi")
    columns: List[ColumnSummary] = Field(..., description="Ringkasan profil setiap kolom")
    standard_columns: List[StandardColumnDefinition] = Field(..., description="Daftar kolom standar acuan aplikasi")
    quality_issues: List[QualityIssue] = Field(..., description="Daftar temuan kualitas data")
    identical_duplicates_count: int = Field(default=0, description="Jumlah baris duplikat identik")
    potential_repeat_measurements_count: int = Field(
        default=0,
        description="Estimasi baris dengan anak yang sama terukur berulang pada waktu berbeda"
    )
    readiness_status: str = Field(
        ...,
        description="Status kesiapan dataset: 'siap_analisis', 'perlu_perhatian', atau 'belum_lengkap'"
    )
    readiness_message: str = Field(..., description="Penjelasan kesiapan dataset untuk tahap analisis berikutnya")
    preview_rows: List[Dict[str, Any]] = Field(
        ...,
        description="Baris pratinjau data (maksimal 100 baris, nilai identitas pribadi disamarkan secara default)"
    )


class ValidateMappingRequest(BaseModel):
    column_mapping: Dict[str, str] = Field(
        ...,
        description="Pemetaan dari nama kolom sumber ke kunci kolom standar (source_column -> standard_key)"
    )


class ValidateMappingResponse(BaseModel):
    is_valid: bool = Field(..., description="Apakah pemetaan memenuhi persyaratan minimum analisis")
    mapped_columns_count: int = Field(..., description="Jumlah kolom sumber yang berhasil dipetakan")
    missing_required_columns: List[str] = Field(
        default_factory=list,
        description="Kolom standar wajib analisis stunting yang belum dipetakan"
    )
    readiness_status: str = Field(..., description="Status kesiapan analisis setelah pemetaan disesuaikan")
    readiness_message: str = Field(..., description="Penjelasan kesiapan setelah pemetaan")
    issues: List[QualityIssue] = Field(default_factory=list, description="Isu lanjutan terkait pemetaan kolom")
