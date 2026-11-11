import type { HealthCheckResult, HealthResponse } from '../types/health';
import type {
  DatasetPreviewResponse,
  StandardColumnDefinition,
  ValidateMappingResponse,
} from '../types/dataManagement';
import type { DashboardSummaryResponse } from '../types/dashboard';

/**
 * Base URL untuk API Backend.
 * Dapat di-override melalui environment variable VITE_API_BASE_URL.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Fungsi untuk memeriksa status kesehatan backend Stunting Toba via GET /api/health.
 * Menghitung latensi dan menangani kemungkinan kegagalan koneksi secara aman.
 */
export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const startTime = performance.now();
  const endpoint = `${API_BASE_URL}/api/health`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 detik timeout

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return {
        status: 'disconnected',
        error: `Server merespon dengan status HTTP ${response.status} (${response.statusText})`,
        latencyMs,
        checkedAt: new Date(),
      };
    }

    const data: HealthResponse = await response.json();

    return {
      status: 'connected',
      data,
      latencyMs,
      checkedAt: new Date(),
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    let errorMessage = 'Gagal menghubungi server backend';

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        errorMessage = 'Koneksi timeout (server tidak merespon dalam 5 detik)';
      } else {
        errorMessage = err.message || errorMessage;
      }
    }

    return {
      status: 'disconnected',
      error: `${errorMessage}. Pastikan Uvicorn/FastAPI sedang berjalan di port 8000.`,
      latencyMs,
      checkedAt: new Date(),
    };
  }
}

/**
 * Mengunggah file dataset (.csv atau .xlsx) untuk diperiksa struktur dan kualitasnya.
 */
export async function uploadDatasetPreview(file: File): Promise<DatasetPreviewResponse> {
  const endpoint = `${API_BASE_URL}/api/data/upload-preview`;
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = 'Gagal memproses berkas dataset.';
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      errorDetail = `Error HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Memvalidasi konfigurasi pemetaan kolom yang disesuaikan pengguna.
 */
export async function validateColumnMapping(
  mapping: Record<string, string>
): Promise<ValidateMappingResponse> {
  const endpoint = `${API_BASE_URL}/api/data/validate-mapping`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ column_mapping: mapping }),
  });

  if (!response.ok) {
    let errorDetail = 'Gagal memvalidasi pemetaan kolom.';
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      errorDetail = `Error HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Mengambil daftar referensi kolom standar antropometri dari backend.
 */
export async function getStandardColumns(): Promise<StandardColumnDefinition[]> {
  const endpoint = `${API_BASE_URL}/api/data/standard-columns`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil definisi kolom standar (${response.status})`);
  }

  return response.json();
}

/**
 * Mengambil dataset aktif saat ini dari backend jika ada.
 */
export async function getActiveDataset(): Promise<DatasetPreviewResponse | null> {
  const endpoint = `${API_BASE_URL}/api/data/active-dataset`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

/**
 * Mengambil data visualisasi statistik balita dengan filter opsional.
 */
export async function fetchVisualizationData(
  filter?: import('../types/visualization').VisualizationFilterRequest
): Promise<import('../types/visualization').VisualizationResponse> {
  const endpoint = `${API_BASE_URL}/api/visualization`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(filter || {}),
  });

  if (!response.ok) {
    let errorDetail = 'Gagal memuat data visualisasi.';
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      errorDetail = `Error HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Mengambil ringkasan analitik Dashboard Utama dinamis dari dataset aktif.
 * Mendukung filter wilayah level desa (Tableau Filter Action).
 */
export async function fetchDashboardSummary(
  desaFilter?: string | null
): Promise<DashboardSummaryResponse> {
  const url = new URL(`${API_BASE_URL}/api/dashboard/summary`);
  if (desaFilter && desaFilter.trim() !== '') {
    url.searchParams.set('desa_kelurahan', desaFilter.trim());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let errorDetail = 'Gagal memuat data ringkasan dashboard.';
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      errorDetail = `Error HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
