import React, { useState, useEffect } from 'react';
import { PageHeader } from '../dashboard/PageHeader';
import { FileUploadZone } from './FileUploadZone';
import { ValidationSummaryCards } from './ValidationSummaryCards';
import { QualityIssuesPanel } from './QualityIssuesPanel';
import { ColumnMappingSection } from './ColumnMappingSection';
import { DatasetPreviewTable } from './DatasetPreviewTable';

import {
  uploadDatasetPreview,
  validateColumnMapping,
  getStandardColumns,
  getActiveDataset,
} from '../../services/api';
import type {
  DatasetPreviewResponse,
  StandardColumnDefinition,
  ValidateMappingResponse,
} from '../../types/dataManagement';
import { createSyntheticSampleFile } from '../../data/syntheticSample';
import { Upload, BarChart3 } from 'lucide-react';

interface DataBalitaPageProps {
  onNavigateToVisualisasi?: () => void;
}

export const DataBalitaPage: React.FC<DataBalitaPageProps> = ({ onNavigateToVisualisasi }) => {
  const [standardColumns, setStandardColumns] = useState<StandardColumnDefinition[]>([]);
  const [dataset, setDataset] = useState<DatasetPreviewResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [savedMapping, setSavedMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ValidateMappingResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Periksa apakah terdapat perubahan pemetaan yang belum disimpan/divalidasi
  const hasUnsavedMapping = Boolean(
    dataset &&
    (Object.keys(columnMapping).length !== Object.keys(savedMapping).length ||
      Object.keys(columnMapping).some((k) => columnMapping[k] !== savedMapping[k]))
  );

  // Ambil referensi kolom standar dan dataset aktif saat inisialisasi
  useEffect(() => {
    getStandardColumns()
      .then((cols) => setStandardColumns(cols))
      .catch((err) => console.warn('Gagal memuat definisi kolom standar:', err));

    getActiveDataset()
      .then((active) => {
        if (active) {
          setDataset(active);
        }
      })
      .catch((err) => console.warn('Gagal memuat dataset aktif:', err));
  }, []);

  // Saat dataset berhasil dimuat, set inisial mapping dari saran otomatis backend
  useEffect(() => {
    if (dataset) {
      const initialMap: Record<string, string> = {};
      dataset.columns.forEach((col) => {
        if (col.suggested_mapping) {
          initialMap[col.name] = col.suggested_mapping;
        }
      });
      setColumnMapping(initialMap);
      setSavedMapping(initialMap);
      setValidationResult(null);
    }
  }, [dataset]);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await uploadDatasetPreview(file);
      setDataset(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan tidak terduga saat memproses file.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSyntheticSample = async () => {
    const sampleFile = createSyntheticSampleFile();
    await handleFileUpload(sampleFile);
  };

  const handleValidateMapping = async (
    mappingToValidate: Record<string, string>
  ): Promise<ValidateMappingResponse> => {
    setIsValidating(true);
    try {
      const res = await validateColumnMapping(mappingToValidate);
      setValidationResult(res);

      // Hanya perbarui savedMapping jika lolos validasi (tidak auto-save mapping tidak valid)
      if (res.is_valid) {
        setSavedMapping({ ...mappingToValidate });
      }

      // Sinkronkan status kesiapan pada dataset
      if (dataset) {
        setDataset({
          ...dataset,
          readiness_status: res.readiness_status,
          readiness_message: res.readiness_message,
        });
      }
      return res;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal memvalidasi pemetaan kolom.');
      throw err;
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Manajemen Data Balita"
          description="Unggah, pratinjau, dan validasi kelengkapan data antropometri balita Kabupaten Toba untuk dasar analisis stunting."
        />

        {dataset && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {onNavigateToVisualisasi && (
              <div className="flex items-center gap-2">
                {hasUnsavedMapping && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                    Pemetaan belum disimpan
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (hasUnsavedMapping) {
                      alert(
                        'Terdapat perubahan pemetaan kolom yang belum divalidasi & disimpan. Silakan klik "Validasi & Simpan Pemetaan" pada bagian Pemetaan Kolom terlebih dahulu.'
                      );
                      return;
                    }
                    onNavigateToVisualisasi();
                  }}
                  disabled={hasUnsavedMapping}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-white text-[13px] font-semibold transition-all shadow-2xs whitespace-nowrap ${
                    hasUnsavedMapping
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-teal-600 hover:bg-teal-700 cursor-pointer'
                  }`}
                  title={
                    hasUnsavedMapping
                      ? 'Simpan dan validasi pemetaan kolom terlebih dahulu sebelum membuka visualisasi'
                      : 'Buka Visualisasi Data Balita'
                  }
                >
                  <BarChart3 className="w-4 h-4" />
                  Buka Visualisasi Data
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setDataset(null);
                setErrorMessage(null);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium transition-colors shadow-2xs whitespace-nowrap"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              Unggah Berkas Lain
            </button>
          </div>
        )}
      </div>

      {/* Bagian 1: Upload File Area (Tampil jika belum ada dataset aktif) */}
      {!dataset ? (
        <div className="space-y-6">
          <FileUploadZone
            onFileUpload={handleFileUpload}
            onLoadSyntheticSample={handleLoadSyntheticSample}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          />

          {/* Panduan Kriteria Berkas */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs">
            <h4 className="text-[15px] font-bold text-slate-800">
              Ketentuan & Variabel Data Balita
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12.5px] sm:text-[13px] text-slate-600">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
                <span className="font-bold text-teal-800 block mb-1 text-[13px]">Variabel Wajib Inti:</span>
                Usia Saat Ukur (bulan), Jenis Kelamin (L/P), Berat Badan (kg), Tinggi Badan (cm).
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
                <span className="font-bold text-blue-800 block mb-1 text-[13px]">Variabel Wilayah:</span>
                Puskesmas, Desa/Kelurahan, Posyandu untuk pemetaan sebaran kasus stunting Kabupaten Toba.
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
                <span className="font-bold text-purple-800 block mb-1 text-[13px]">Keamanan & Privasi:</span>
                Data identitas pribadi (NIK, Nama Lengkap, Alamat) disamarkan otomatis pada pratinjau.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Bagian 2: Hasil Pemeriksaan Dataset Lengkap */
        <div className="space-y-6">
          {/* Ringkasan Statistik File */}
          <ValidationSummaryCards data={dataset} />

          {/* Panel Temuan Kualitas Data */}
          <QualityIssuesPanel
            issues={dataset.quality_issues}
            identicalDuplicates={dataset.identical_duplicates_count}
          />

          {/* Pemetaan Kolom Fleksibel */}
          <ColumnMappingSection
            columns={dataset.columns}
            standardColumns={standardColumns.length > 0 ? standardColumns : dataset.standard_columns}
            currentMapping={columnMapping}
            onMappingChange={setColumnMapping}
            onValidateMapping={handleValidateMapping}
            isValidating={isValidating}
            validationResult={validationResult}
            hasUnsavedChanges={hasUnsavedMapping}
          />

          {/* Tabel Pratinjau Data */}
          <DatasetPreviewTable
            columns={dataset.columns}
            rows={dataset.preview_rows}
            filename={dataset.filename}
          />
        </div>
      )}
    </div>
  );
};
