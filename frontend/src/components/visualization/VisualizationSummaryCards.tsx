import React from 'react';
import { Users, Ruler, Weight, Activity, MapPin, CheckCircle2 } from 'lucide-react';
import type { SummaryStats } from '../../types/visualization';

interface VisualizationSummaryCardsProps {
  summary: SummaryStats;
  totalUnfiltered: number;
}

export const VisualizationSummaryCards: React.FC<VisualizationSummaryCardsProps> = ({
  summary,
  totalUnfiltered,
}) => {
  const tbuPct = summary.total_records > 0
    ? Math.round((summary.records_with_tbu / summary.total_records) * 100)
    : 0;
  const bbuPct = summary.total_records > 0
    ? Math.round((summary.records_with_bbu / summary.total_records) * 100)
    : 0;
  const bbtbPct = summary.total_records > 0
    ? Math.round((summary.records_with_bbtb / summary.total_records) * 100)
    : 0;

  const filterPct = totalUnfiltered > 0
    ? Math.round((summary.total_records / totalUnfiltered) * 100)
    : 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-5">
      {/* 1. Total Dianalisis */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11.5px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-wider">
              Total Dianalisis
            </span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100/80 flex items-center justify-center text-teal-600 shadow-2xs">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[26px] lg:text-[28px] font-bold text-slate-900 font-mono tracking-tight leading-none">
              {summary.total_records.toLocaleString('id-ID')}
            </span>
            <span className="text-[12px] font-semibold text-slate-500">balita</span>
          </div>
        </div>
        <div className="mt-3.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[12px] text-slate-600">
            <span>Filter dataset</span>
            <span className="font-semibold text-teal-700 font-mono">{filterPct}% total</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, filterPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Indikator TB/U (Stunting) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11.5px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-wider">
              Status TB/U (Stunting)
            </span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100/80 flex items-center justify-center text-rose-600 shadow-2xs">
              <Ruler className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[26px] lg:text-[28px] font-bold text-slate-900 font-mono tracking-tight leading-none">
              {summary.records_with_tbu.toLocaleString('id-ID')}
            </span>
            <span className="text-[12px] font-semibold text-slate-500">tercatat</span>
          </div>
        </div>
        <div className="mt-3.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[12px] text-slate-600">
            <span>Kelengkapan</span>
            <span className="font-semibold text-rose-700 font-mono">{tbuPct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-rose-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, tbuPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Indikator BB/U (Underweight) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11.5px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-wider">
              Status BB/U (Underweight)
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shadow-2xs">
              <Weight className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[26px] lg:text-[28px] font-bold text-slate-900 font-mono tracking-tight leading-none">
              {summary.records_with_bbu.toLocaleString('id-ID')}
            </span>
            <span className="text-[12px] font-semibold text-slate-500">tercatat</span>
          </div>
        </div>
        <div className="mt-3.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[12px] text-slate-600">
            <span>Kelengkapan</span>
            <span className="font-semibold text-blue-700 font-mono">{bbuPct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, bbuPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Indikator BB/TB (Wasting) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11.5px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-wider">
              Status BB/TB (Wasting)
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shadow-2xs">
              <Activity className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[26px] lg:text-[28px] font-bold text-slate-900 font-mono tracking-tight leading-none">
              {summary.records_with_bbtb.toLocaleString('id-ID')}
            </span>
            <span className="text-[12px] font-semibold text-slate-500">tercatat</span>
          </div>
        </div>
        <div className="mt-3.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[12px] text-slate-600">
            <span>Kelengkapan</span>
            <span className="font-semibold text-amber-700 font-mono">{bbtbPct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, bbtbPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5. Cakupan Wilayah */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11.5px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-wider">
              Cakupan Wilayah
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
              <MapPin className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[26px] lg:text-[28px] font-bold text-slate-900 font-mono tracking-tight leading-none">
              {summary.unique_regions_count}
            </span>
            <span className="text-[12px] font-semibold text-slate-500 capitalize">
              {summary.region_label_used.replace('_', '/')}
            </span>
          </div>
        </div>
        <div className="mt-3.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[12px] text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">
              {summary.valid_records.toLocaleString('id-ID')} data valid
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
