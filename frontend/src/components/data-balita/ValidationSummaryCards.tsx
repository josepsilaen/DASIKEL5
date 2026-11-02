import React from 'react';
import { Database, Columns, AlertTriangle, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import type { DatasetPreviewResponse } from '../../types/dataManagement';

interface ValidationSummaryCardsProps {
  data: DatasetPreviewResponse;
}

export const ValidationSummaryCards: React.FC<ValidationSummaryCardsProps> = ({ data }) => {
  const piiColumnsCount = data.columns.filter((c) => c.is_pii).length;
  const missingValuesCount = data.columns.filter((c) => c.null_count > 0).length;

  const fileSizeFormatted =
    data.file_size_bytes < 1024 * 1024
      ? `${(data.file_size_bytes / 1024).toFixed(1)} KB`
      : `${(data.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`;

  const getStatusBadge = () => {
    switch (data.readiness_status) {
      case 'siap_analisis':
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          badgeText: 'Siap untuk Analisis Dasar',
        };
      case 'perlu_perhatian':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          badgeText: 'Perlu Perhatian Pemetaan',
        };
      case 'belum_lengkap':
      default:
        return {
          icon: XCircle,
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-700',
          badgeText: 'Belum Lengkap untuk Stunting',
        };
    }
  };

  const statusConfig = getStatusBadge();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Kartu 1: Total Baris Data */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-medium text-slate-500">Total Baris Data</p>
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <Database className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-bold text-slate-800 tabular-nums">
            {data.total_rows.toLocaleString('id-ID')}
          </span>
          <span className="text-[13px] text-slate-400 font-medium">baris balita</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Berkas: <span className="font-medium text-slate-600 truncate">{data.filename}</span> ({fileSizeFormatted})
        </p>
      </div>

      {/* Kartu 2: Kolom Terdeteksi */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-medium text-slate-500">Struktur Kolom</p>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Columns className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-bold text-slate-800 tabular-nums">
            {data.total_columns}
          </span>
          <span className="text-[13px] text-slate-400 font-medium">kolom tabel</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span className="text-[11px] text-slate-500">
            {piiColumnsCount > 0
              ? `${piiColumnsCount} kolom identitas pribadi disamarkan`
              : 'Tidak terdeteksi identitas pribadi sensitif'}
          </span>
        </div>
      </div>

      {/* Kartu 3: Catatan Kualitas Data */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-medium text-slate-500">Integritas Data</p>
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-bold text-slate-800 tabular-nums">
            {data.identical_duplicates_count}
          </span>
          <span className="text-[13px] text-slate-400 font-medium">duplikat identik</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          {missingValuesCount > 0
            ? `${missingValuesCount} kolom memuat nilai kosong`
            : 'Seluruh sel terisi lengkap'}
        </p>
      </div>

      {/* Kartu 4: Status Kesiapan Analisis */}
      <div className={`rounded-xl border p-5 ${statusConfig.bg} ${statusConfig.border} transition-colors shadow-2xs`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-medium text-slate-600">Kesiapan Analisis</p>
          <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
        </div>
        <p className={`text-[17px] font-bold ${statusConfig.text} leading-tight`}>
          {statusConfig.badgeText}
        </p>
        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed line-clamp-2" title={data.readiness_message}>
          {data.readiness_message}
        </p>
      </div>
    </div>
  );
};
