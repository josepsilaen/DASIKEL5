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
} from '../../services/api';
import type {
  DatasetPreviewResponse,
  StandardColumnDefinition,
  ValidateMappingResponse,
} from '../../types/dataManagement';
import { createSyntheticSampleFile } from '../../data/syntheticSample';
import { Upload } from 'lucide-react';

export const DataBalitaPage: React.FC = () => {
  const [standardColumns, setStandardColumns] = useState<StandardColumnDefinition[]>([]);
  const [dataset, setDataset] = useState<DatasetPreviewResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ValidateMappingResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ambil referensi kolom standar saat inisialisasi
  useEffect(() => {
    getStandardColumns()
      .then((cols) => setStandardColumns(cols))
      .catch((err) => console.warn('Gagal memuat definisi kolom standar:', err));
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
          <button
            type="button"
            onClick={() => {
              setDataset(null);
              setErrorMessage(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium transition-colors shadow-2xs whitespace-nowrap self-start sm:self-auto"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            Unggah Berkas Lain
          </button>
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
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h4 className="text-[14px] font-semibold text-slate-800">
              Ketentuan & Variabel Data Balita
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px] text-slate-600">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-teal-800 block mb-1">Variabel Wajib Inti:</span>
                Usia Saat Ukur (bulan), Jenis Kelamin (L/P), Berat Badan (kg), Tinggi Badan (cm).
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-blue-800 block mb-1">Variabel Wilayah:</span>
                Puskesmas, Desa/Kelurahan, Posyandu untuk pemetaan sebaran kasus stunting Kabupaten Toba.
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-purple-800 block mb-1">Keamanan & Privasi:</span>
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
