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
    updated_at: Optional[str] = Field(default=None, description="Waktu terakhir dataset diunggah atau diperbarui")
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

    # Kualitas dan Kelengkapan Data
    total_quality_issues: int = Field(default=0, description="Total isu kualitas data teridentifikasi")
    missing_values_count: int = Field(default=0, description="Estimasi jumlah sel kosong pada dataset")
    duplicates_count: int = Field(default=0, description="Jumlah baris duplikat identik")
    repeat_measurements_count: int = Field(default=0, description="Jumlah potensi pengukuran berulang")
    out_of_range_count: int = Field(default=0, description="Jumlah nilai di luar rentang fisiologis wajar")
    unmapped_required_columns: List[str] = Field(default_factory=list, description="Kolom standar wajib yang belum dipetakan")
    quality_highlights: List[str] = Field(default_factory=list, description="Poin-poin ringkasan kualitas data")

    # Pratinjau Baris Data Riil (Maksimal 6 baris dengan PII tersamar)
    preview_rows: List[Dict[str, Any]] = Field(default_factory=list, description="Sampel baris data balita dengan data pribadi tersamar")
    preview_headers: List[str] = Field(default_factory=list, description="Daftar nama kolom pada tabel sampel")

    # Status & Peringatan
    readiness_status: Optional[str] = Field(default=None, description="Status kesiapan dataset")
    readiness_message: Optional[str] = Field(default=None, description="Pesan kesiapan dataset")
    warnings: List[str] = Field(default_factory=list, description="Daftar peringatan atau catatan metodologis")

    # Lima Kelompok Visualisasi Dashboard Sesuai Tableau
    tableau_analytics: Optional["DashboardTableauAnalytics"] = Field(
        default=None,
        description="Analisis lima kelompok visualisasi Tableau yang dihitung dinamis dari dataset aktif"
    )


class BoxPlotStats(BaseModel):
    min_value: float = Field(..., description="Nilai minimum data")
    q1: float = Field(..., description="Kuartil 1 (25th percentile)")
    median: float = Field(..., description="Median (50th percentile)")
    q3: float = Field(..., description="Kuartil 3 (75th percentile)")
    max_value: float = Field(..., description="Nilai maksimum data")
    mean: float = Field(..., description="Rata-rata")
    count: int = Field(..., description="Jumlah sampel")


class CategoryPrevalenceItem(BaseModel):
    category: str = Field(..., description="Label kategori")
    total_count: int = Field(..., description="Jumlah total balita dalam kelompok")
    stunting_count: int = Field(..., description="Jumlah balita stunting dalam kelompok")
    normal_count: int = Field(..., description="Jumlah balita normal/tidak stunting dalam kelompok")
    stunting_rate: float = Field(..., description="Prevalensi stunting (%)")
    percentage_of_total: float = Field(..., description="Porsi terhadap total populasi terdata (%)")


class ScatterPoint(BaseModel):
    x: float = Field(..., description="Nilai sumbu X")
    y: float = Field(..., description="Nilai sumbu Y (Z-Score TB/U)")
    is_stunting: bool = Field(..., description="Apakah balita stunting")
    label: Optional[str] = Field(default=None, description="Label identitas wilayah/balita tersamar")


class DashboardSection1BirthWeight(BaseModel):
    has_column: bool = Field(default=False)
    unmapped_reason: Optional[str] = Field(default=None)
    total_valid: int = Field(default=0)
    mean_birth_weight: Optional[float] = Field(default=None)
    bblr_count: int = Field(default=0)
    bblr_rate_overall: float = Field(default=0.0, description="% BBLR dari seluruh balita")
    bblr_stunting_count: int = Field(default=0)
    bblr_stunting_rate: float = Field(default=0.0, description="% BBLR yang mengalami stunting")
    normal_count: int = Field(default=0)
    normal_stunting_rate: float = Field(default=0.0, description="% Normal berat lahir yang stunting")
    categories: List[CategoryPrevalenceItem] = Field(default_factory=list)
    boxplot_stunting: Optional[BoxPlotStats] = Field(default=None)
    boxplot_normal: Optional[BoxPlotStats] = Field(default=None)
    scatter_sample: List[ScatterPoint] = Field(default_factory=list)


class AgeCohortItem(BaseModel):
    cohort_label: str = Field(..., description="Label kelompok umur (misal: 0–5 bln)")
    total_count: int = Field(default=0)
    stunting_count: int = Field(default=0)
    stunting_rate: float = Field(default=0.0)
    mean_zscore_tbu: Optional[float] = Field(default=None)
    boxplot: Optional[BoxPlotStats] = Field(default=None)


class DashboardSection2AgeCohort(BaseModel):
    has_column: bool = Field(default=False)
    unmapped_reason: Optional[str] = Field(default=None)
    highest_stunting_cohort: Optional[str] = Field(default=None)
    highest_stunting_rate: Optional[float] = Field(default=None)
    lowest_mean_zscore_cohort: Optional[str] = Field(default=None)
    cohorts: List[AgeCohortItem] = Field(default_factory=list)


class DesaSpreadItem(BaseModel):
    desa_name: str = Field(...)
    kecamatan: Optional[str] = Field(default=None)
    total_balita: int = Field(default=0)
    stunting_count: int = Field(default=0)
    stunting_rate: float = Field(default=0.0)
    is_above_avg: bool = Field(default=False)


class KecamatanSpreadItem(BaseModel):
    kecamatan_name: str = Field(...)
    total_balita: int = Field(default=0)
    stunting_count: int = Field(default=0)
    stunting_rate: float = Field(default=0.0)
    desa_count: int = Field(default=0)


class DashboardSection3RegionalSpread(BaseModel):
    has_column: bool = Field(default=False)
    unmapped_reason: Optional[str] = Field(default=None)
    avg_desa_stunting_rate: float = Field(default=0.0)
    desas_above_avg_count: int = Field(default=0)
    total_desas_count: int = Field(default=0)
    top_10_high_stunting_desas: List[DesaSpreadItem] = Field(default_factory=list)
    all_desas: List[DesaSpreadItem] = Field(default_factory=list)
    kecamatan_spread: List[KecamatanSpreadItem] = Field(default_factory=list)


class HeatmapCell(BaseModel):
    row_var: str = Field(...)
    col_var: str = Field(...)
    correlation: Optional[float] = Field(default=None)
    sample_size: int = Field(default=0)


class DashboardSection4PosyanduParenting(BaseModel):
    has_naik_bb: bool = Field(default=False)
    naik_bb_unmapped_reason: Optional[str] = Field(default=None)
    naik_bb_overall_rate: Optional[float] = Field(default=None, description="% Balita status N (Naik)")
    naik_bb_categories: List[CategoryPrevalenceItem] = Field(default_factory=list)
    has_kelas_ibu: bool = Field(default=False)
    kelas_ibu_unmapped_reason: Optional[str] = Field(default=None)
    kelas_ibu_participation_rate: Optional[float] = Field(default=None, description="% Ibu ikut kelas balita")
    kelas_ibu_categories: List[CategoryPrevalenceItem] = Field(default_factory=list)
    correlation_variables: List[str] = Field(default_factory=list)
    correlation_cells: List[HeatmapCell] = Field(default_factory=list)


class DashboardSection5MaternalFactors(BaseModel):
    has_lila: bool = Field(default=False)
    lila_unmapped_reason: Optional[str] = Field(default=None)
    kek_risk_rate: Optional[float] = Field(default=None, description="% Ibu LiLA < 23.5 cm")
    lila_categories: List[CategoryPrevalenceItem] = Field(default_factory=list)
    bblr_rate_overall: float = Field(default=0.0)
    bblr_categories: List[CategoryPrevalenceItem] = Field(default_factory=list)
    has_panjang_lahir: bool = Field(default=False)
    panjang_lahir_unmapped_reason: Optional[str] = Field(default=None)
    scatter_panjang_sample: List[ScatterPoint] = Field(default_factory=list)


class AnnotatedTimeSeriesPoint(BaseModel):
    period_label: str = Field(...)
    total_measured: int = Field(default=0)
    stunting_count: int = Field(default=0)
    stunting_rate: float = Field(default=0.0)
    annotation: Optional[str] = Field(default=None)


class DashboardTimeSeriesTrend(BaseModel):
    has_date_column: bool = Field(default=False)
    unmapped_reason: Optional[str] = Field(default=None)
    points: List[AnnotatedTimeSeriesPoint] = Field(default_factory=list)


class DashboardTableauAnalytics(BaseModel):
    selected_desa_filter: Optional[str] = Field(default=None, description="Desa yang sedang menjadi filter aktif jika ada")
    section1_birth_weight: DashboardSection1BirthWeight = Field(default_factory=DashboardSection1BirthWeight)
    section2_age_cohort: DashboardSection2AgeCohort = Field(default_factory=DashboardSection2AgeCohort)
    section3_regional_spread: DashboardSection3RegionalSpread = Field(default_factory=DashboardSection3RegionalSpread)
    section4_posyandu_parenting: DashboardSection4PosyanduParenting = Field(default_factory=DashboardSection4PosyanduParenting)
    section5_maternal_factors: DashboardSection5MaternalFactors = Field(default_factory=DashboardSection5MaternalFactors)
    time_series_trend: DashboardTimeSeriesTrend = Field(default_factory=DashboardTimeSeriesTrend)


# Resolve forward references
DashboardSummaryResponse.model_rebuild()

