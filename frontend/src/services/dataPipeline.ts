
import { API_BASE_URL } from './api';
import type { ValidateMappingResponse } from '../types/dataManagement';

export interface ActiveMappingResponse {
  column_mapping: Record<string, string>;
  is_validated: boolean;
  validation_result: ValidateMappingResponse | null;
}

export interface ETLAudit {
  jumlah_baris: number;
  baris_berubah: number;
  jumlah_perubahan: number;
  jenis_perubahan: Record<string, number>;
  catatan: string;
}

export interface ETLPreviewResponse {
  audit: ETLAudit;
  belum_diterapkan: boolean;
  pesan: string;
}

export interface ETLApplyResponse {
  diterapkan: boolean;
  audit: ETLAudit;
  riwayat_eksekusi: number;
}

export interface ETLHistoryResponse {
  riwayat: ETLAudit[];
  sudah_di_etl: boolean;
}

export interface WarehouseStats {
  tersedia: boolean;
  jumlah?: Record<string, number>;
  catatan?: string;
  sesuai_dataset_aktif?: boolean;
  integritas_referensi?: boolean;
  jumlah_pelanggaran_referensi?: number;
  jumlah_baris_sumber_saat_build?: number | null;
  dibangun_pada_utc?: string | null;
  granularitas?: Record<string, string>;
}

export interface WarehouseBuildResponse {
  dibangun: boolean;
  jumlah: Record<string, number>;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });
  if (!response.ok) {
    let message = `Permintaan gagal (HTTP ${response.status})`;
    try {
      const json: { detail?: string } = await response.json();
      if (json.detail) message = json.detail;
    } catch {
      // Beberapa kegagalan HTTP tidak mengembalikan JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const getActiveMapping = () =>
  request<ActiveMappingResponse>('/api/data/current-mapping');

export const previewETL = () =>
  request<ETLPreviewResponse>('/api/data/etl/preview');

export const applyETL = () =>
  request<ETLApplyResponse>('/api/data/etl/apply', {
    method: 'POST', body: JSON.stringify({ setuju: true }),
  });

export const fetchETLHistory = () =>
  request<ETLHistoryResponse>('/api/data/etl/audit');

export const buildWarehouse = () =>
  request<WarehouseBuildResponse>('/api/warehouse/build', {
    method: 'POST', body: JSON.stringify({ setuju: true }),
  });

export const fetchWarehouseStats = () =>
  request<WarehouseStats>('/api/warehouse/stats');

export async function downloadCleanCSV(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/data/etl/export.csv`);
  if (!response.ok) {
    let detail = `Gagal mengekspor CSV (HTTP ${response.status}).`;
    try {
      const error: { detail?: string } = await response.json();
      if (error.detail) detail = error.detail;
    } catch {
      // Abaikan jika error bukan JSON.
    }
    throw new Error(detail);
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'stunting_dataset_terdeidentifikasi.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
