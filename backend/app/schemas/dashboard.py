"""
Skema Pydantic untuk Dashboard Utama Dinamis Stunting Toba.
Menyediakan agregasi KPI ringkasan, distribusi indikator antropometri aktual,
tren pengukuran bulanan, dan pratinjau data balita tersamar dari dataset aktif.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.schemas.visualization import DistributionItem


class DashboardMonthlyTrendItem(BaseModel):
    bulan: str = Field(..., description="Label bulan (contoh: 'Jan', 'Feb', atau 'Jan 2024')")
    tercatat: int = Field(default=0, description="Jumlah pengukuran tercatat pada bulan ini")
    valid: int = Field(default=0, description="Jumlah pengukuran dengan nilai valid")


class DashboardRiskFactorItem(BaseModel):
    faktor: str = Field(..., description="Nama determinan atau faktor risiko")
    jumlah: int = Field(..., description="Frekuensi kemunculan kasus")
    persentase: float = Field(default=0.0, description="Persentase terhadap total catatan")
    warna: Optional[str] = Field(default=None, description="Kode warna visualisasi")


class DashboardRegionSummaryItem(BaseModel):
    nama: str = Field(..., description="Nama unit wilayah (Kecamatan atau Puskesmas)")
    count: int = Field(..., description="Jumlah total catatan balita")
    percentage: float = Field(..., description="Persentase terhadap total wilayah")
    stunting_count: Optional[int] = Field(default=None, description="Jumlah balita stunting jika TB/U tersedia")


class DashboardSummaryResponse(BaseModel):
    has_active_dataset: bool = Field(..., description="Apakah terdapat dataset aktif yang terhubung")
    filename: Optional[str] = Field(default=None, description="Nama file dataset aktif")
    total_records: int = Field(default=0, description="Jumlah baris catatan balita dalam dataset aktif")
    valid_records: int = Field(default=0, description="Jumlah data yang memenuhi kelengkapan atribut valid")
    need_check_records: int = Field(default=0, description="Jumlah data yang memerlukan pemeriksaan kualitas")
    valid_percentage: float = Field(default=0.0, description="Persentase data valid")
    need_check_percentage: float = Field(default=0.0, description="Persentase data yang perlu diperiksa")

    # Cakupan Wilayah
    has_region: bool = Field(default=False, description="Apakah variabel wilayah tersedia")
    total_kecamatan: int = Field(default=0, description="Jumlah kecamatan yang tercakup")
    total_puskesmas: int = Field(default=0, description="Jumlah puskesmas yang tercakup")
    total_desa: int = Field(default=0, description="Jumlah desa/kelurahan yang tercakup")
    region_label_used: str = Field(default="wilayah", description="Label wilayah dominan ('kecamatan' atau 'puskesmas')")
    region_summary: List[DashboardRegionSummaryItem] = Field(default_factory=list, description="Ringkasan sebaran per unit wilayah")

    # Status Stunting (TB/U)
    has_status_tbu: bool = Field(default=False, description="Apakah status stunting TB/U tersedia")
    status_tbu_unmapped_reason: Optional[str] = Field(default=None, description="Alasan jika TB/U tidak tersedia")
    stunted_count: int = Field(default=0, description="Jumlah balita terindikasi stunting (Pendek / Sangat Pendek)")
    stunted_percentage: float = Field(default=0.0, description="Persentase stunting terhadap data TB/U valid")
    tbu_distribution: List[DistributionItem] = Field(default_factory=list, description="Distribusi kategori TB/U")

    # Status Gizi Tambahan (BB/U & BB/TB)
    has_status_bbu: bool = Field(default=False, description="Apakah kolom BB/U tersedia")
    bbu_distribution: List[DistributionItem] = Field(default_factory=list, description="Distribusi kategori BB/U")
    has_status_bbtb: bool = Field(default=False, description="Apakah kolom BB/TB tersedia")
    bbtb_distribution: List[DistributionItem] = Field(default_factory=list, description="Distribusi kategori BB/TB")

    # Karakteristik Usia & Gender
    has_age: bool = Field(default=False, description="Apakah kolom usia balita tersedia")
    in_scope_balita_count: int = Field(default=0, description="Jumlah balita usia 0–59 bulan")
    out_of_scope_age_count: int = Field(default=0, description="Jumlah anak usia ≥ 60 bulan")
    age_distribution: List[DistributionItem] = Field(default_factory=list, description="Distribusi kohor usia balita")

    has_gender: bool = Field(default=False, description="Apakah kolom jenis kelamin tersedia")
    gender_distribution: List[DistributionItem] = Field(default_factory=list, description="Komposisi gender")

    # Tren Pengukuran Berdasarkan Tanggal
    has_date_trend: bool = Field(default=False, description="Apakah kolom tanggal pengukuran tersedia dan valid")
    date_trend_unmapped_reason: Optional[str] = Field(default=None, description="Alasan jika tren tanggal tidak dapat disajikan")
    monthly_trend: List[DashboardMonthlyTrendItem] = Field(default_factory=list, description="Tren data tercatat vs valid per bulan")

    # Faktor Risiko Determinan
    has_risk_factors: bool = Field(default=False, description="Apakah variabel faktor risiko tersedia")
    risk_factors_unmapped_reason: Optional[str] = Field(
        default=None,
        description="Pesan penjelas jika determinan faktor risiko belum ada di dataset"
    )
    risk_factors: List[DashboardRiskFactorItem] = Field(default_factory=list, description="Komposisi faktor risiko")

    # Pratinjau Baris Data Riil (Maksimal 6 baris dengan PII tersamar)
    preview_rows: List[Dict[str, Any]] = Field(default_factory=list, description="Sampel baris data balita dengan data pribadi tersamar")
    preview_headers: List[str] = Field(default_factory=list, description="Daftar nama kolom pada tabel sampel")

    # Status & Peringatan
    readiness_status: Optional[str] = Field(default=None, description="Status kesiapan dataset")
    readiness_message: Optional[str] = Field(default=None, description="Pesan kesiapan dataset")
    warnings: List[str] = Field(default_factory=list, description="Daftar peringatan atau catatan metodologis")

