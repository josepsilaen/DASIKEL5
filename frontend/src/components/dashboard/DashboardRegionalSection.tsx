import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import type { DashboardRegionSummaryItem } from '../../types/dashboard';

interface DashboardRegionalSectionProps {
  hasRegion: boolean;
  totalKecamatan: number;
  totalPuskesmas: number;
  totalDesa: number;
  regionLabelUsed: string;
  regionSummary: DashboardRegionSummaryItem[];
  hasStatusTbu: boolean;
  onGoToVisualization: () => void;
  onGoToDataBalita: () => void;
}

export const DashboardRegionalSection: React.FC<DashboardRegionalSectionProps> = ({
  hasRegion,
  totalKecamatan,
  totalPuskesmas,
  totalDesa,
  regionLabelUsed,
  regionSummary,
  hasStatusTbu,
  onGoToVisualization,
  onGoToDataBalita,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">
              Cakupan & Sebaran Wilayah Terbanyak
            </h3>
            <p className="text-[12px] text-slate-500">
              Distribusi catatan balita berdasarkan unit administratif {regionLabelUsed}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToVisualization}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100/70 border border-teal-200/90 transition-colors cursor-pointer self-start sm:self-center"
        >
          Eksplorasi Wilayah di Visualisasi
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {hasRegion ? (
        <div className="space-y-4">
          {/* Badge Rekap Total Wilayah */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-center">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Kecamatan
              </span>
              <span className="text-[18px] sm:text-[20px] font-bold text-slate-900 tabular-nums">
                {totalKecamatan > 0 ? totalKecamatan : '-'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-center">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Puskesmas
              </span>
              <span className="text-[18px] sm:text-[20px] font-bold text-slate-900 tabular-nums">
                {totalPuskesmas > 0 ? totalPuskesmas : '-'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-center">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Desa / Kelurahan
              </span>
              <span className="text-[18px] sm:text-[20px] font-bold text-slate-900 tabular-nums">
                {totalDesa > 0 ? totalDesa : '-'}
              </span>
            </div>
          </div>

          {/* Tabel / List Wilayah Terbanyak */}
          <div className="space-y-2">
            <h4 className="text-[12.5px] font-bold text-slate-700">
              Wilayah dengan Jumlah Catatan Terbanyak
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {regionSummary.map((reg, idx) => (
                <div
                  key={reg.nama}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11.5px] text-slate-500">
                    <span className="font-semibold text-slate-400">#{idx + 1}</span>
                    <span className="font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                      {reg.percentage}%
                    </span>
                  </div>
                  <div className="font-bold text-[13.5px] text-slate-800 truncate" title={reg.nama}>
                    {reg.nama}
                  </div>
                  <div className="text-[12px] text-slate-600 flex items-center justify-between">
                    <span>Jumlah Catatan:</span>
                    <strong className="font-semibold text-slate-900">{reg.count.toLocaleString('id-ID')}</strong>
                  </div>
                  {hasStatusTbu && reg.stunting_count !== null && reg.stunting_count !== undefined && (
                    <div className="text-[11.5px] text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/70 flex items-center justify-between">
                      <span>Stunting (TB/U):</span>
                      <span className="font-bold">{reg.stunting_count}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2.5 my-2">
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <MapPin className="w-4 h-4" />
          </div>
          <h5 className="text-[13.5px] font-bold text-slate-800">
            Variabel Wilayah Belum Dipetakan
          </h5>
          <p className="text-[12px] text-slate-500 max-w-sm mx-auto">
            Petakan kolom kecamatan, puskesmas, atau desa pada dataset aktif untuk melihat sebaran geografis data balita.
          </p>
          <button
            type="button"
            onClick={onGoToDataBalita}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-200 transition-colors cursor-pointer"
          >
            Petakan Kolom Wilayah
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <p className="text-[11.5px] text-slate-400 border-t border-slate-100 pt-2">
        * Sebaran wilayah menunjukkan jumlah baris catatan balita tercatat.
        {!hasStatusTbu && ' Angka kasus stunting wilayah tidak diklaim karena indikator TB/U belum dipetakan.'}
      </p>
    </div>
  );
};
