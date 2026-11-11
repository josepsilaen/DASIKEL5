import React from 'react';
import { Database, BarChart3, RefreshCw, FileSpreadsheet, Clock, CheckCircle } from 'lucide-react';

interface ActiveDatasetBannerProps {
  filename: string;
  totalRecords: number;
  validRecords: number;
  validPercentage: number;
  updatedAt?: string | null;
  readinessStatus?: string | null;
  onGoToDataBalita: () => void;
  onGoToVisualization: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const ActiveDatasetBanner: React.FC<ActiveDatasetBannerProps> = ({
  filename,
  totalRecords,
  validRecords,
  validPercentage,
  updatedAt,
  readinessStatus,
  onGoToDataBalita,
  onGoToVisualization,
  onRefresh,
  isLoading = false,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-950 shadow-2xs">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white shrink-0 shadow-xs">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-teal-950">
              Dataset Aktif: {filename}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 border border-teal-200">
              <CheckCircle className="w-3 h-3 text-teal-600" />
              Dataset Aktif
            </span>
            {readinessStatus && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 capitalize">
                Status: {readinessStatus.replace(/_/g, ' ')}
              </span>
            )}
            {updatedAt && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-teal-700 bg-white/70 border border-teal-200">
                <Clock className="w-3 h-3 text-teal-600" />
                Diperbarui: {updatedAt}
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-teal-800 leading-relaxed">
            Menampilkan data agregasi dari{' '}
            <strong className="font-semibold text-teal-950">
              {totalRecords.toLocaleString('id-ID')} total catatan
            </strong>{' '}
            ({validRecords.toLocaleString('id-ID')} valid / {validPercentage.toFixed(1)}%).
            Dashboard terhubung langsung dengan dataset aktif dan tersinkronisasi dengan menu Visualisasi.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap pt-2 md:pt-0">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-white hover:bg-teal-100/50 text-teal-900 border border-teal-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Segarkan data ringkasan dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-700 ${isLoading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
        )}

        <button
          type="button"
          onClick={onGoToDataBalita}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-white hover:bg-teal-100/50 text-teal-900 border border-teal-300 shadow-2xs transition-colors cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-teal-700" />
          Kelola Dataset
        </button>

        <button
          type="button"
          onClick={onGoToVisualization}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-2xs transition-colors cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Buka Visualisasi
        </button>
      </div>
    </div>
  );
};
