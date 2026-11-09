/**
 * Tipe data TypeScript untuk Fitur Manajemen Data Balita.
 * Mendefinisikan struktur respon profil dataset, isu kualitas, dan pemetaan kolom.
 */

export interface ColumnSummary {
  name: string;
  detected_type: 'integer' | 'float' | 'string' | 'date' | 'boolean';
  total_count: number;
  null_count: number;
  null_percentage: number;
  sample_values: string[];
  is_pii: boolean;
  pii_status?: 'confirmed' | 'suspicious' | 'safe';
  pii_reason?: string | null;
  suggested_mapping: string | null;
  mapping_confidence: number;
}

export interface QualityIssue {
  issue_type:
    | 'missing_values'
    | 'duplicates'
    | 'invalid_range'
    | 'type_mismatch'
    | 'unmapped'
    | 'suspicious_pii'
    | 'unsupported_structure'
    | string;
  severity: 'error' | 'warning' | 'info';
  column?: string | null;
  message: string;
  affected_rows_count: number;
  details?: string | null;
}

export interface StandardColumnDefinition {
  key: string;
  label: string;
  description: string;
  category: 'core' | 'administrative' | 'clinical';
  is_required_for_stunting: boolean;
  expected_type: string;
  unit?: string | null;
  aliases: string[];
}

export interface DatasetPreviewResponse {
  filename: string;
  file_type: 'csv' | 'xlsx';
  file_size_bytes: number;
  total_rows: number;
  total_columns: number;
  columns: ColumnSummary[];
  standard_columns: StandardColumnDefinition[];
  quality_issues: QualityIssue[];
  identical_duplicates_count: number;
  potential_repeat_measurements_count: number;
  readiness_status: 'siap_analisis' | 'perlu_perhatian' | 'belum_lengkap';
  readiness_message: string;
  preview_rows: Record<string, any>[];
}

export interface ValidateMappingRequest {
  column_mapping: Record<string, string>;
}

export interface ValidateMappingResponse {
  is_valid: boolean;
  mapped_columns_count: number;
  missing_required_columns: string[];
  readiness_status: 'siap_analisis' | 'perlu_perhatian' | 'belum_lengkap';
  readiness_message: string;
  issues: QualityIssue[];
}
