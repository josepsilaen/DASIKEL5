import React from 'react';
import { Filter, X, MapPin } from 'lucide-react';

interface DashboardActiveDesaBannerProps {
  selectedDesa: string | null;
  onReset: () => void;
  totalBalita?: number;
  stuntingRate?: number;
}

export const DashboardActiveDesaBanner: React.FC<DashboardActiveDesaBannerProps> = ({
  selectedDesa,
  onReset,
  totalBalita,
  stuntingRate,
}) => {
  if (!selectedDesa) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-teal-200 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-teal-600 text-white shadow-xs">
          <Filter className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Filter Tableau Aktif
            </span>
            <span className="text-xs text-slate-500">Membatasi data pada:</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
            Desa {selectedDesa}
            {totalBalita !== undefined && (
              <span className="ml-2 text-xs font-normal text-slate-600">
                ({totalBalita.toLocaleString('id-ID')} balita
                {stuntingRate !== undefined ? `, prevalensi stunting: ${stuntingRate.toFixed(1)}%` : ''})
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis Berat Lahir, Kelompok Usia, Posyandu, dan Faktor Ibu kini hanya menghitung data dari desa ini.
          </p>
        </div>
      </div>

      <button
        onClick={onReset}
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-white hover:bg-teal-50 border border-teal-300 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
        title="Batalkan penyaringan dan tampilkan seluruh Kabupaten Toba"
      >
        <X className="w-3.5 h-3.5" />
        Reset Filter Wilayah
      </button>
    </div>
  );
};

