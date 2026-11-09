import React from 'react';
import {
  Database,
  Upload,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
} from 'lucide-react';

interface DashboardEmptyStateProps {
  onGoToDataBalita: () => void;
  onToggleSyntheticPreview?: () => void;
  showSyntheticPreview?: boolean;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  onGoToDataBalita,
  onToggleSyntheticPreview,
  showSyntheticPreview = false,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-9 lg:p-11 text-center max-w-3xl mx-auto space-y-6">
      {/* Icon Badge */}
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center mx-auto text-amber-700 shadow-2xs">
        <Database className="w-7 h-7" />
      </div>

      {/* Heading & Subtitle */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 text-amber-800 text-[11.5px] font-semibold tracking-wide uppercase">
          <ShieldAlert className="w-3.5 h-3.5" />
          Dataset Aktif Belum Tersedia
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Belum Ada Dataset Puskesmas yang Aktif
        </h3>
        <p className="text-[13.5px] sm:text-[14px] text-slate-600 max-w-xl mx-auto leading-relaxed">
          Dashboard Utama Stunting Toba disiapkan untuk menyajikan analitik faktor risiko stunting berdasarkan data riil Puskesmas se-Kabupaten Toba.
          Untuk menjaga integritas ilmiah penelitian, <strong className="text-slate-900 font-semibold">tidak ada angka rekaan yang disajikan sebagai hasil penelitian riil</strong> sebelum dataset resmi diunggah.
        </p>
      </div>

      {/* Langkah / Informasi Panduan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left pt-1">
        <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shadow-2xs">
            <Upload className="w-4 h-4" />
          </div>
          <h4 className="text-[13.5px] font-bold text-slate-800">1. Unggah Dataset</h4>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            Unggah file data balita Puskesmas (.csv atau .xlsx) melalui menu Manajemen Data Balita.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shadow-2xs">
            <Layers className="w-4 h-4" />
          </div>
          <h4 className="text-[13.5px] font-bold text-slate-800">2. Konfirmasi Skema</h4>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            Petakan kolom antropometri dan karakteristik balita sesuai format standar sistem.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-[13.5px] font-bold text-slate-800">3. Analitik Otomatis</h4>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            Ringkasan data, grafik tren, dan visualisasi distribusi akan terbit secara dinamis.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onGoToDataBalita}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl font-semibold text-[13.5px] transition-all shadow-xs hover:shadow-md cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Unggah Dataset di Data Balita
          <ArrowRight className="w-4 h-4" />
        </button>

        {onToggleSyntheticPreview && (
          <button
            type="button"
            onClick={onToggleSyntheticPreview}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-[13.5px] transition-all shadow-2xs cursor-pointer"
          >
            {showSyntheticPreview ? (
              <>
                <EyeOff className="w-4 h-4 text-slate-500" />
                Sembunyikan Data Contoh
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-slate-500" />
                Tampilkan Pratinjau UI (Data Contoh)
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-[11.5px] text-slate-400">
        * Dataset balita yang diunggah diproses aman dengan perlindungan privasi dan deteksi PII otomatis.
      </p>
    </div>
  );
};
