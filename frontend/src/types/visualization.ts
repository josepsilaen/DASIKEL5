/**
 * Tipe data TypeScript untuk Fitur Visualisasi Data Balita (Stage 4.1).
 * Mencakup struktur distribusi status gizi (TB/U, BB/U, BB/TB), kelompok usia,
 * jenis kelamin, distribusi per wilayah, nilai Z-score, dan opsi filter interaktif.
 * Diperluas untuk mendukung Lima Kelompok Analisis Mendalam (Tableau Analytics).
 */
import type { DashboardTableauAnalytics } from './dashboard';

export interface DistributionItem {
  category: string;
  count: number;
  percentage: number;
}

export interface RegionDistributionItem {
  region_name: string;
  count: number;
  percentage: number;
  stunting_count?: number | null;
  normal_count?: number | null;
}

export interface SummaryStats {
  total_records: number;
  valid_records: number;
  records_with_tbu: number;
  records_with_bbu: number;
  records_with_bbtb: number;
  records_with_age: number;
  in_scope_balita_count?: number;
  out_of_scope_age_count?: number;
  unique_regions_count: number;
  region_label_used: string;
}

export interface FilterOptions {
  kecamatan_list: string[];
  puskesmas_list: string[];
  desa_kelurahan_list: string[];
  jenis_kelamin_list: string[];
  age_group_list: string[];
  periode_list: string[];
}

export interface VisualizationFilterRequest {
  kecamatan?: string | null;
  puskesmas?: string | null;
  desa_kelurahan?: string | null;
  jenis_kelamin?: string | null;
  age_group?: string | null;
  status_stunting?: string | null;
  periode?: string | null;
  region_type?: 'kecamatan' | 'puskesmas' | 'desa_kelurahan';
  column_mapping?: Record<string, string>;
}

export interface ZScoreStats {
  has_column: boolean;
  unmapped_reason?: string | null;
  count_valid: number;
  mean?: number | null;
  median?: number | null;
  min_value?: number | null;
  max_value?: number | null;
  distribution: DistributionItem[];
}

export interface VisualizationResponse {
  has_active_dataset: boolean;
  filename?: string | null;
  total_unfiltered_rows: number;
  total_filtered_rows: number;

  // KPI Ringkasan
  summary?: SummaryStats | null;

  // 1. Status TB/U
  has_status_tbu_column: boolean;
  status_tbu_distribution: DistributionItem[];
  status_tbu_unmapped_reason?: string | null;

  // 2. Status BB/U
  has_status_bbu_column: boolean;
  status_bbu_distribution: DistributionItem[];
  status_bbu_unmapped_reason?: string | null;

  // 3. Status BB/TB
  has_status_bbtb_column: boolean;
  status_bbtb_distribution: DistributionItem[];
  status_bbtb_unmapped_reason?: string | null;

  // 4. Kelompok Usia
  has_age_column: boolean;
  age_group_distribution: DistributionItem[];
  age_unmapped_reason?: string | null;

  // 5. Jenis Kelamin
  has_gender_column: boolean;
  gender_distribution: DistributionItem[];
  gender_unmapped_reason?: string | null;

  // 6. Wilayah
  available_region_types: string[];
  selected_region_type: string;
  region_distribution: RegionDistributionItem[];
  region_unmapped_reason?: string | null;

  // 7. Z-Score (TB/U, BB/U, BB/TB)
  zscore_tbu: ZScoreStats;
  zscore_bbu: ZScoreStats;
  zscore_bbtb: ZScoreStats;

  // Filter & Status
  filter_options: FilterOptions;
  active_filters: Record<string, string | null | undefined>;
  warnings: string[];

  // Lima Kelompok Analisis Mendalam Tableau
  tableau_analytics?: DashboardTableauAnalytics | null;
}
