"""
Skema Pydantic untuk Fitur Visualisasi Data Balita (Stage 4.1).
Mendukung agregasi statistik deskriptif, distribusi status gizi (TB/U, BB/U, BB/TB),
komposisi kelompok usia, jenis kelamin, distribusi wilayah, serta analisis Z-Score.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class DistributionItem(BaseModel):
    category: str = Field(..., description="Nama label kategori (contoh: Normal, Pendek, Laki-laki)")
    count: int = Field(..., description="Jumlah frekuensi balita dalam kategori ini")
    percentage: float = Field(..., description="Persentase terhadap total data valid terisi (0.0 - 100.0)")


class RegionDistributionItem(BaseModel):
    region_name: str = Field(..., description="Nama wilayah (kecamatan, puskesmas, atau desa)")
    count: int = Field(..., description="Jumlah balita tercatat di wilayah ini")
    percentage: float = Field(..., description="Persentase terhadap total balita pada level wilayah ini")
    stunting_count: Optional[int] = Field(
        default=None,
        description="Jumlah balita terindikasi stunting (Pendek / Sangat Pendek) jika kolom status TB/U tersedia"
    )
    normal_count: Optional[int] = Field(
        default=None,
        description="Jumlah balita berstatus normal jika kolom status TB/U tersedia"
    )


class ZScoreStats(BaseModel):
    has_column: bool = Field(default=False, description="Apakah kolom Z-score tersedia")
    unmapped_reason: Optional[str] = Field(default=None, description="Alasan jika kolom tidak tersedia")
    count_valid: int = Field(default=0, description="Jumlah data z-score valid")
    mean: Optional[float] = Field(default=None, description="Rata-rata z-score")
    median: Optional[float] = Field(default=None, description="Median z-score")
    min_value: Optional[float] = Field(default=None, description="Nilai minimum z-score")
    max_value: Optional[float] = Field(default=None, description="Nilai maksimum z-score")
    distribution: List[DistributionItem] = Field(default_factory=list, description="Distribusi nilai z-score berdasarkan rentang baku WHO")


class SummaryStats(BaseModel):
    total_records: int = Field(..., description="Total baris data balita yang dianalisis (setelah filter)")
    valid_records: int = Field(..., description="Jumlah baris data yang memiliki nilai antropometri valid")
    records_with_tbu: int = Field(..., description="Jumlah balita yang memiliki data status gizi TB/U")
    records_with_bbu: int = Field(default=0, description="Jumlah balita yang memiliki data status gizi BB/U")
    records_with_bbtb: int = Field(default=0, description="Jumlah balita yang memiliki data status gizi BB/TB")
    records_with_age: int = Field(default=0, description="Jumlah balita yang memiliki data usia valid")
    in_scope_balita_count: int = Field(default=0, description="Jumlah balita dalam cakupan kohor penelitian (0–59 bulan)")
    out_of_scope_age_count: int = Field(default=0, description="Jumlah data anak usia ≥ 60 bulan (di luar cakupan balita 0–59 bulan)")
    unique_regions_count: int = Field(..., description="Jumlah wilayah administratif unik yang tercatat")
    region_label_used: str = Field(..., description="Label jenis wilayah utama yang digunakan ('kecamatan', 'puskesmas', atau 'desa_kelurahan')")


class FilterOptions(BaseModel):
    kecamatan_list: List[str] = Field(default_factory=list, description="Daftar kecamatan unik yang tersedia di dataset")
    puskesmas_list: List[str] = Field(default_factory=list, description="Daftar puskesmas unik yang tersedia di dataset")
    desa_kelurahan_list: List[str] = Field(default_factory=list, description="Daftar desa/kelurahan unik yang tersedia di dataset")
    jenis_kelamin_list: List[str] = Field(default_factory=list, description="Daftar variasi jenis kelamin yang tersedia di dataset")
    age_group_list: List[str] = Field(default_factory=list, description="Daftar kategori kelompok usia yang tersedia")
    periode_list: List[str] = Field(default_factory=list, description="Daftar periode pengukuran yang tersedia di dataset")


class VisualizationFilterRequest(BaseModel):
    kecamatan: Optional[str] = Field(default=None, description="Filter berdasarkan kecamatan tertentu")
    puskesmas: Optional[str] = Field(default=None, description="Filter berdasarkan puskesmas tertentu")
    desa_kelurahan: Optional[str] = Field(default=None, description="Filter berdasarkan desa/kelurahan tertentu")
    jenis_kelamin: Optional[str] = Field(default=None, description="Filter berdasarkan jenis kelamin (L/P)")
    age_group: Optional[str] = Field(default=None, description="Filter kelompok usia (contoh: 0-5, 6-11, 12-23, 24-35, 36-47, 48-59, 60+)")
    periode: Optional[str] = Field(default=None, description="Filter berdasarkan periode pengukuran")
    region_type: Optional[str] = Field(
        default="puskesmas",
        description="Pilihan agregasi wilayah yang ingin ditampilkan: 'kecamatan', 'puskesmas', atau 'desa_kelurahan'"
    )
    column_mapping: Optional[Dict[str, str]] = Field(
        default=None,
        description="Pemetaan kolom kustom (opsional) jika berbeda dari pemetaan awal"
    )


class VisualizationResponse(BaseModel):
    has_active_dataset: bool = Field(..., description="Apakah terdapat dataset aktif yang telah diunggah")
    filename: Optional[str] = Field(default=None, description="Nama file dataset aktif")
    total_unfiltered_rows: int = Field(default=0, description="Total keseluruhan baris dataset sebelum filter")
    total_filtered_rows: int = Field(default=0, description="Total baris dataset yang memenuhi kriteria filter")
    
    # Bagian A: Ringkasan Statistik KPI
    summary: Optional[SummaryStats] = Field(default=None, description="Ringkasan statistik kuantitatif data balita")
    
    # Bagian B: Distribusi Status Gizi (TB/U, BB/U, BB/TB)
    has_status_tbu_column: bool = Field(default=False, description="Apakah kolom Status TB/U tersedia di dataset")
    status_tbu_distribution: List[DistributionItem] = Field(default_factory=list, description="Daftar kategori TB/U, jumlah, dan persentasenya")
    status_tbu_unmapped_reason: Optional[str] = Field(default=None, description="Pesan penjelasan jika kolom TB/U tidak tersedia")
    
    has_status_bbu_column: bool = Field(default=False, description="Apakah kolom Status BB/U tersedia di dataset")
    status_bbu_distribution: List[DistributionItem] = Field(default_factory=list, description="Daftar kategori BB/U, jumlah, dan persentasenya")
    status_bbu_unmapped_reason: Optional[str] = Field(default=None, description="Pesan penjelasan jika kolom BB/U tidak tersedia")

    has_status_bbtb_column: bool = Field(default=False, description="Apakah kolom Status BB/TB tersedia di dataset")
    status_bbtb_distribution: List[DistributionItem] = Field(default_factory=list, description="Daftar kategori BB/TB, jumlah, dan persentasenya")
    status_bbtb_unmapped_reason: Optional[str] = Field(default=None, description="Pesan penjelasan jika kolom BB/TB tidak tersedia")

    # Bagian C: Distribusi Kelompok Usia
    has_age_column: bool = Field(default=False, description="Apakah kolom usia balita tersedia di dataset")
    age_group_distribution: List[DistributionItem] = Field(default_factory=list, description="Distribusi balita per kelompok usia")
    age_unmapped_reason: Optional[str] = Field(default=None, description="Pesan penjelasan jika kolom usia tidak tersedia")

    # Bagian D: Distribusi Jenis Kelamin
    has_gender_column: bool = Field(default=False, description="Apakah kolom jenis kelamin tersedia di dataset")
    gender_distribution: List[DistributionItem] = Field(default_factory=list, description="Komposisi balita laki-laki dan perempuan")
    gender_unmapped_reason: Optional[str] = Field(default=None, description="Pesan penjelasan jika kolom jenis kelamin tidak tersedia")
    
    # Bagian E: Distribusi Wilayah
    available_region_types: List[str] = Field(
        default_factory=list,
        description="Jenis wilayah yang kolomnya tersedia di dataset ('kecamatan', 'puskesmas', 'desa_kelurahan')"
    )
    selected_region_type: str = Field(
        default="puskesmas",
        description="Tipe wilayah aktif yang sedang ditampilkan grafiknya"
    )
    region_distribution: List[RegionDistributionItem] = Field(
        default_factory=list,
        description="Daftar wilayah beserta jumlah dan persentase balita"
    )
    region_unmapped_reason: Optional[str] = Field(
        default=None,
        description="Pesan penjelasan jika kolom wilayah tidak tersedia"
    )

    # Bagian F: Distribusi Z-Score (TB/U, BB/U, BB/TB)
    zscore_tbu: ZScoreStats = Field(default_factory=ZScoreStats, description="Statistik dan distribusi z-score TB/U")
    zscore_bbu: ZScoreStats = Field(default_factory=ZScoreStats, description="Statistik dan distribusi z-score BB/U")
    zscore_bbtb: ZScoreStats = Field(default_factory=ZScoreStats, description="Statistik dan distribusi z-score BB/TB")
    
    # Bagian G: Opsi Filter
    filter_options: FilterOptions = Field(default_factory=FilterOptions, description="Daftar opsi dropdown filter yang valid")
    active_filters: Dict[str, Optional[str]] = Field(default_factory=dict, description="Nilai filter yang sedang aktif")
    warnings: List[str] = Field(default_factory=list, description="Catatan atau batasan validitas dataset")
