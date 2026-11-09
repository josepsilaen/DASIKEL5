import React from 'react';
import { AlertTriangle, Database, EyeOff } from 'lucide-react';

interface DashboardNoticeBannerProps {
  onGoToDataBalita: () => void;
  onHideSyntheticPreview: () => void;
}

export const DashboardNoticeBanner: React.FC<DashboardNoticeBannerProps> = ({
  onGoToDataBalita,
  onHideSyntheticPreview,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-4.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold text-amber-950">
              Mode Pratinjau Desain (Data Sintetis Statis)
            </span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10.5px] font-semibold bg-amber-200/80 text-amber-900">
              Bukan Data Penelitian
            </span>
          </div>
          <p className="text-[12px] sm:text-[12.5px] text-amber-800 leading-relaxed max-w-4xl">
            Dataset final Puskesmas belum aktif. Seluruh metrik kartu, grafik tren, dan faktor risiko di bawah ini merupakan data contoh untuk evaluasi antarmuka dan tidak mencerminkan data riil Kabupaten Toba.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
        <button
          type="button"
          onClick={onHideSyntheticPreview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-300 shadow-2xs transition-colors cursor-pointer"
          title="Tampilkan halaman status kosong tanpa data contoh"
        >
          <EyeOff className="w-3.5 h-3.5 text-amber-700" />
          Sembunyikan Data Contoh
        </button>

        <button
          type="button"
          onClick={onGoToDataBalita}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-2xs transition-colors cursor-pointer"
        >
          <Database className="w-3.5 h-3.5" />
          Unggah Dataset
        </button>
      </div>
    </div>
  );
};
