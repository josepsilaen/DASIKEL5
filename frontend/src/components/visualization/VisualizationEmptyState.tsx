import React from 'react';
import { BarChart3, Upload, Database, ArrowRight, ShieldCheck } from 'lucide-react';

interface VisualizationEmptyStateProps {
  onGoToDataBalita: () => void;
}

export const VisualizationEmptyState: React.FC<VisualizationEmptyStateProps> = ({
  onGoToDataBalita,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-8 sm:p-10 lg:p-12 text-center max-w-3xl mx-auto space-y-6">
      {/* Icon Badge */}
      <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600 shadow-sm">
        <BarChart3 className="w-7 h-7" />
      </div>

      {/* Heading & Subtitle */}
      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Belum Ada Dataset Balita Aktif
        </h3>
        <p className="text-[14px] sm:text-[14.5px] text-slate-600 max-w-xl mx-auto leading-relaxed">
          Halaman Visualisasi Stunting Toba menyajikan grafik statistik dan distribusi karakteristik balita secara{' '}
          <strong className="text-slate-900 font-semibold">murni dinamis</strong> berdasarkan dataset yang Anda unggah.
          Sistem tidak menggunakan angka sintetis atau data tiruan saat dataset belum tersedia.
        </p>
      </div>

      {/* Information Cards (3 Langkah Mudah) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left pt-1">
        <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shadow-2xs">
            <Upload className="w-4 h-4" />
          </div>
          <h4 className="text-[14px] font-bold text-slate-800">1. Unggah Dataset</h4>
          <p className="text-[12.5px] text-slate-500 leading-relaxed">
            Unggah file data balita berformat .csv atau .xlsx pada menu Manajemen Data Balita.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shadow-2xs">
            <Database className="w-4 h-4" />
          </div>
          <h4 className="text-[14px] font-bold text-slate-800">2. Petakan Kolom</h4>
          <p className="text-[12.5px] text-slate-500 leading-relaxed">
            Pastikan kolom Usia, JK, TB/U, BB/U, BB/TB, dan Wilayah terpetakan dengan tepat.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shadow-2xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-[14px] font-bold text-slate-800">3. Eksplorasi Visual</h4>
          <p className="text-[12.5px] text-slate-500 leading-relaxed">
            Seluruh diagram distribusi, komparasi wilayah, dan histogram z-score terbit otomatis.
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onGoToDataBalita}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-[13.5px] font-semibold transition-all shadow-sm hover:shadow-md"
        >
          <span>Buka Manajemen Data Balita</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
