import type { DistributionItem } from './visualization';

export interface DashboardMonthlyTrendItem {
  bulan: string;
  tercatat: number;
  valid: number;
}

export interface DashboardRiskFactorItem {
  faktor: string;
  jumlah: number;
  persentase: number;
  warna?: string | null;
}

export interface DashboardRegionSummaryItem {
  nama: string;
  count: number;
  percentage: number;
  stunting_count?: number | null;
}

export interface BoxPlotStats {
  min_value: number;
  q1: number;
  median: number;
  q3: number;
  max_value: number;
  mean: number;
  count: number;
}

export interface CategoryPrevalenceItem {
  category: string;
  total_count: number;
  stunting_count: number;
  normal_count: number;
  stunting_rate: number;
  percentage_of_total: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
  is_stunting: boolean;
  label?: string | null;
}

export interface DashboardSection1BirthWeight {
  has_column: boolean;
  unmapped_reason?: string | null;
  total_valid: number;
  mean_birth_weight?: number | null;
  bblr_count: number;
  bblr_rate_overall: number;
  bblr_stunting_count: number;
  bblr_stunting_rate: number;
  normal_count: number;
  normal_stunting_rate: number;
  categories: CategoryPrevalenceItem[];
  boxplot_stunting?: BoxPlotStats | null;
  boxplot_normal?: BoxPlotStats | null;
  scatter_sample: ScatterPoint[];
}

export interface AgeCohortItem {
  cohort_label: string;
  total_count: number;
  stunting_count: number;
  stunting_rate: number;
  mean_zscore_tbu?: number | null;
  boxplot?: BoxPlotStats | null;
}

export interface DashboardSection2AgeCohort {
  has_column: boolean;
  unmapped_reason?: string | null;
  highest_stunting_cohort?: string | null;
  highest_stunting_rate?: number | null;
  lowest_mean_zscore_cohort?: string | null;
  cohorts: AgeCohortItem[];
}

export interface DesaSpreadItem {
  desa_name: string;
  kecamatan?: string | null;
  total_balita: number;
  stunting_count: number;
  stunting_rate: number;
  is_above_avg: boolean;
}

export interface KecamatanSpreadItem {
  kecamatan_name: string;
  total_balita: number;
  stunting_count: number;
  stunting_rate: number;
  desa_count: number;
}

export interface DashboardSection3RegionalSpread {
  has_column: boolean;
  unmapped_reason?: string | null;
  avg_desa_stunting_rate: number;
  desas_above_avg_count: number;
  total_desas_count: number;
  top_10_high_stunting_desas: DesaSpreadItem[];
  all_desas: DesaSpreadItem[];
  kecamatan_spread?: KecamatanSpreadItem[];
}

export interface HeatmapCell {
  row_var: string;
  col_var: string;
  correlation?: number | null;
  sample_size: number;
}

export interface DashboardSection4PosyanduParenting {
  has_naik_bb: boolean;
  naik_bb_unmapped_reason?: string | null;
  naik_bb_overall_rate?: number | null;
  naik_bb_categories: CategoryPrevalenceItem[];
  has_kelas_ibu: boolean;
  kelas_ibu_unmapped_reason?: string | null;
  kelas_ibu_participation_rate?: number | null;
  kelas_ibu_categories: CategoryPrevalenceItem[];
  correlation_variables: string[];
  correlation_cells: HeatmapCell[];
}

export interface DashboardSection5MaternalFactors {
  has_lila: boolean;
  lila_unmapped_reason?: string | null;
  kek_risk_rate?: number | null;
  lila_categories: CategoryPrevalenceItem[];
  bblr_rate_overall: number;
  bblr_categories: CategoryPrevalenceItem[];
  has_panjang_lahir: boolean;
  panjang_lahir_unmapped_reason?: string | null;
  scatter_panjang_sample: ScatterPoint[];
}

export interface AnnotatedTimeSeriesPoint {
  period_label: string;
  total_measured: number;
  stunting_count: number;
  stunting_rate: number;
  annotation?: string | null;
}

export interface DashboardTimeSeriesTrend {
  has_date_column: boolean;
  unmapped_reason?: string | null;
  points: AnnotatedTimeSeriesPoint[];
}

export interface DashboardTableauAnalytics {
  selected_desa_filter?: string | null;
  section1_birth_weight: DashboardSection1BirthWeight;
  section2_age_cohort: DashboardSection2AgeCohort;
  section3_regional_spread: DashboardSection3RegionalSpread;
  section4_posyandu_parenting: DashboardSection4PosyanduParenting;
  section5_maternal_factors: DashboardSection5MaternalFactors;
  time_series_trend?: DashboardTimeSeriesTrend;
}

export interface DashboardSummaryResponse {
  has_active_dataset: boolean;
  filename?: string | null;
  updated_at?: string | null;
  total_records: number;
  valid_records: number;
  need_check_records: number;
  valid_percentage: number;
  need_check_percentage: number;

  // Cakupan Wilayah
  has_region: boolean;
  total_kecamatan: number;
  total_puskesmas: number;
  total_desa: number;
  region_label_used: string;
  region_summary: DashboardRegionSummaryItem[];

  // Status Stunting (TB/U)
  has_status_tbu: boolean;
  status_tbu_unmapped_reason?: string | null;
  stunted_count: number;
  stunted_percentage: number;
  tbu_distribution: DistributionItem[];

  // Status Gizi Tambahan
  has_status_bbu: boolean;
  bbu_distribution: DistributionItem[];
  has_status_bbtb: boolean;
  bbtb_distribution: DistributionItem[];

  // Usia & Gender
  has_age: boolean;
  in_scope_balita_count: number;
  out_of_scope_age_count: number;
  age_distribution: DistributionItem[];

  has_gender: boolean;
  gender_distribution: DistributionItem[];

  // Tren Pengukuran
  has_date_trend: boolean;
  date_trend_unmapped_reason?: string | null;
  monthly_trend: DashboardMonthlyTrendItem[];

  // Faktor Risiko
  has_risk_factors: boolean;
  risk_factors_unmapped_reason?: string | null;
  risk_factors: DashboardRiskFactorItem[];

  // Kualitas dan Kelengkapan Data
  total_quality_issues: number;
  missing_values_count: number;
  duplicates_count: number;
  repeat_measurements_count: number;
  out_of_range_count: number;
  unmapped_required_columns: string[];
  quality_highlights: string[];

  // Pratinjau Baris Data
  preview_rows: Record<string, any>[];
  preview_headers: string[];

  // Status & Peringatan
  readiness_status?: string | null;
  readiness_message?: string | null;
  warnings: string[];

  // Analisis Lima Kelompok Visualisasi Tableau
  tableau_analytics?: DashboardTableauAnalytics | null;
}
