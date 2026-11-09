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

export interface DashboardSummaryResponse {
  has_active_dataset: boolean;
  filename?: string | null;
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

  // Pratinjau Baris Data
  preview_rows: Record<string, any>[];
  preview_headers: string[];

  // Status & Peringatan
  readiness_status?: string | null;
  readiness_message?: string | null;
  warnings: string[];
}
