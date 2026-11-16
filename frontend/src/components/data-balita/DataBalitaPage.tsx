
import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, RefreshCw, Upload } from 'lucide-react';

import { PageHeader } from '../dashboard/PageHeader';
import { FileUploadZone } from './FileUploadZone';
import { ValidationSummaryCards } from './ValidationSummaryCards';
import { QualityIssuesPanel } from './QualityIssuesPanel';
import { ColumnMappingSection } from './ColumnMappingSection';
import { DatasetPreviewTable } from './DatasetPreviewTable';
import { ETLWorkflowSection } from './ETLWorkflowSection';

import {
  getActiveDataset,
  getStandardColumns,
  uploadDatasetPreview,
  validateColumnMapping,
} from '../../services/api';
import { getActiveMapping } from '../../services/dataPipeline';
import type {
  DatasetPreviewResponse,
  StandardColumnDefinition,
  ValidateMappingResponse,
} from '../../types/dataManagement';
import { createSyntheticSampleFile } from '../../data/syntheticSample';

interface DataBalitaPageProps {
  onNavigateToVisualisasi?: () => void;
}

function suggestMapping(data: DatasetPreviewResponse): Record<string, string> {
  const suggested: Record<string, string> = {};
  data.columns.forEach((column) => {
    if (column.suggested_mapping) suggested[column.name] = column.suggested_mapping;
  });
  return suggested;
}

export const DataBalitaPage: React.FC<DataBalitaPageProps> = ({ onNavigateToVisualisasi }) => {
  const [standardColumns, setStandardColumns] = useState<StandardColumnDefinition[]>([]);
  const [dataset, setDataset] = useState<DatasetPreviewResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [savedMapping, setSavedMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ValidateMappingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [datasetRevision, setDatasetRevision] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState({ etl: false, warehouse: false });

  const hasUnsavedMapping = Boolean(dataset && (
    Object.keys(columnMapping).length !== Object.keys(savedMapping).length ||
    Object.keys(columnMapping).some((source) => columnMapping[source] !== savedMapping[source])
  ));
  const mappingValidated = Boolean(validationResult?.is_valid) && !hasUnsavedMapping;

  const handlePipelineStatus = useCallback((status: { etl: boolean; warehouse: boolean }) => {
    setPipelineStatus((old) =>
      old.etl === status.etl && old.warehouse === status.warehouse ? old : status
    );
  }, []);

  // Pulihkan dataset dan pemetaan yang sebelumnya tersimpan di backend.
  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const [standard, active] = await Promise.all([
          getStandardColumns(), getActiveDataset(),
        ]);
        if (cancelled) return;
        setStandardColumns(standard);
        if (active) {
          setDataset(active);
          const suggested = suggestMapping(active);
          try {
            const stored = await getActiveMapping();
            if (cancelled) return;
            const restored = stored.column_mapping || suggested;
            setColumnMapping(restored);
            setSavedMapping(restored);
            setValidationResult(
              stored.is_validated ? stored.validation_result : null
            );
          } catch {
            if (cancelled) return;
            setColumnMapping(suggested);
            setSavedMapping(suggested);
            setValidationResult(null);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Gagal memuat data.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, []);

  async function handleFileUpload(file: File) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await uploadDatasetPreview(file);
      const mapping = suggestMapping(result);
      setDataset(result);
      setColumnMapping(mapping);
      setSavedMapping(mapping);
      setValidationResult(null);
      setPipelineStatus({ etl: false, warehouse: false });
      setDatasetRevision((current) => current + 1);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengunggah berkas.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleValidateMapping(mapping: Record<string, string>) {
    setIsValidating(true);
    try {
      const result = await validateColumnMapping(mapping);
      setValidationResult(result);
      if (result.is_valid) {
        setSavedMapping({ ...mapping });
      }
      if (dataset) {
        setDataset({
          ...dataset,
          readiness_status: result.readiness_status,
          readiness_message: result.readiness_message,
        });
      }
      return result;
    } finally {
      setIsValidating(false);
    }
  }

  async function handleETLApplied() {
    const active = await getActiveDataset();
    if (!active) throw new Error('Dataset aktif tidak ditemukan setelah ETL.');
    setDataset(active);
  }

  function handleMappingChange(mapping: Record<string, string>) {
    setColumnMapping(mapping);
    setValidationResult(null);
    setPipelineStatus({ etl: pipelineStatus.etl, warehouse: false });
  }

  function changeFile() {
    setDataset(null);
    setColumnMapping({});
    setSavedMapping({});
    setValidationResult(null);
    setPipelineStatus({ etl: false, warehouse: false });
    setErrorMessage(null);
  }

  const steps = [
    { label: '1. Unggah', done: Boolean(dataset) },
    { label: '2. Pemetaan', done: Object.keys(columnMapping).length > 0 },
    { label: '3. Validasi', done: mappingValidated },
    { label: '4. ETL', done: pipelineStatus.etl },
    { label: '5. Warehouse & Ekspor', done: pipelineStatus.warehouse },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <PageHeader
          title="Manajemen Data & ETL"
          description="Unggah dataset, periksa kualitas, petakan kolom, jalankan ETL, bangun warehouse, dan ekspor CSV terdeidentifikasi."
        />
        {dataset && (
          <div className="flex flex-wrap gap-2">
            {onNavigateToVisualisasi && (
              <button type="button" onClick={onNavigateToVisualisasi} disabled={!mappingValidated}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-40">
                <BarChart3 className="h-4 w-4" />Lihat Visualisasi
              </button>
            )}
            <button type="button" onClick={changeFile}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Upload className="h-4 w-4" />Ganti Berkas
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
        {steps.map((step) => (
          <div key={step.label}
            className={`rounded-md border px-2 py-2 text-[11px] font-semibold ${step.done ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-500'}`}>
            {step.label}
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />Memuat data…
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {errorMessage}
        </div>
      )}

      {!dataset ? (
        !isLoading && (
          <FileUploadZone
            onFileUpload={(file) => { void handleFileUpload(file); }}
            onLoadSyntheticSample={() => { void handleFileUpload(createSyntheticSampleFile()); }}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          />
        )
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            <strong>Dataset aktif:</strong> {dataset.filename} — {dataset.total_rows.toLocaleString('id-ID')} baris.
            Dataset tersimpan sementara di memori FastAPI dan dapat hilang ketika backend restart.
          </div>
          <ValidationSummaryCards data={dataset} />
          <QualityIssuesPanel
            issues={dataset.quality_issues}
            identicalDuplicates={dataset.identical_duplicates_count}
          />
          <ColumnMappingSection
            columns={dataset.columns}
            standardColumns={standardColumns.length ? standardColumns : dataset.standard_columns}
            currentMapping={columnMapping}
            onMappingChange={handleMappingChange}
            onValidateMapping={handleValidateMapping}
            isValidating={isValidating}
            validationResult={validationResult}
            hasUnsavedChanges={hasUnsavedMapping}
          />
          <ETLWorkflowSection
            key={datasetRevision}
            mappingValidated={mappingValidated}
            onETLApplied={handleETLApplied}
            onStatusChange={handlePipelineStatus}
          />
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
