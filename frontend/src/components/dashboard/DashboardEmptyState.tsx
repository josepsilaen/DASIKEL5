import React from 'react';
import {
  Database,
  Upload,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface DashboardEmptyStateProps {
  onGoToDataBalita: () => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  onGoToDataBalita,
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
          Belum Ada Dataset Aktif
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Belum Ada Dataset Aktif
        </h3>
        <p className="text-[13.5px] sm:text-[14px] text-slate-600 max-w-xl mx-auto leading-relaxed">
          Dashboard Utama Stunting Toba menyajikan analitik faktor risiko stunting yang bersumber dari dataset aktif Puskesmas se-Kabupaten Toba.
          Untuk menjaga integritas ilmiah penelitian, <strong className="text-slate-900 font-semibold">tidak ada angka rekaan atau data dummy yang disajikan</strong> ketika belum ada dataset yang diaktifkan.
        </p>
      </div>

      {/* Panduan Singkat Alur Aktivasi Dataset */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-left pt-1">
        <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shadow-2xs">
            <Upload className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-[13px] font-bold text-slate-800">1. Unggah</h4>
          <p className="text-[11.5px] text-slate-500 leading-relaxed">
            Unggah berkas balita (.csv atau .xlsx) dari Puskesmas.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shadow-2xs">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-[13px] font-bold text-slate-800">2. Pemetaan</h4>
          <p className="text-[11.5px] text-slate-500 leading-relaxed">
            Petakan kolom sumber ke atribut antropometri standar.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-[13px] font-bold text-slate-800">3. Validasi</h4>
          <p className="text-[11.5px] text-slate-500 leading-relaxed">
            Periksa kelengkapan, duplikasi, dan rentang data.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-[13px] font-bold text-slate-800">4. Analitik</h4>
          <p className="text-[11.5px] text-slate-500 leading-relaxed">
            Statistik dan visualisasi terbit secara dinamis.
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-center pt-2">
        <button
          type="button"
          onClick={onGoToDataBalita}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl font-semibold text-[13.5px] transition-all shadow-xs hover:shadow-md cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Kelola Data Balita
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11.5px] text-slate-400">
        * Dataset balita yang diunggah diproses aman dengan perlindungan privasi data pribadi (PII De-identification otomatis).
      </p>
    </div>
  );
};
