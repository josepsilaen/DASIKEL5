import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AlertCircle, TrendingUp, Info } from 'lucide-react';
import type { ZScoreStats, DistributionItem } from '../../types/visualization';

interface ZScoreDistributionPanelProps {
  zscoreTbu: ZScoreStats;
  zscoreBbu: ZScoreStats;
  zscoreBbtb: ZScoreStats;
}

// Warna baku z-score WHO
const ZSCORE_BIN_COLORS: Record<string, string> = {
  '< -3 SD': '#dc2626',      // Merah - Defisit Sangat Berat
  '-3 s/d -2 SD': '#ea580c', // Oranye - Defisit Sedang
  '-2 s/d -1 SD': '#f59e0b', // Amber - Batas Bawah
  '-1 s/d 0 SD': '#10b981',  // Hijau - Median Bawah
  '0 s/d +1 SD': '#059669',  // Hijau Tua - Median Atas
  '+1 s/d +2 SD': '#0284c7', // Biru - Batas Atas
  '> +2 SD': '#7c3aed',      // Ungu - Tinggi / Berlebih
};

export const ZScoreDistributionPanel: React.FC<ZScoreDistributionPanelProps> = ({
  zscoreTbu,
  zscoreBbu,
  zscoreBbtb,
}) => {
  const [activeTab, setActiveTab] = useState<'tbu' | 'bbu' | 'bbtb'>('tbu');

  const currentStats =
    activeTab === 'tbu'
      ? zscoreTbu
      : activeTab === 'bbu'
      ? zscoreBbu
      : zscoreBbtb;

  const indicatorLabel =
    activeTab === 'tbu'
      ? 'Z-Score TB/U (Tinggi Badan / Umur - Stunting)'
      : activeTab === 'bbu'
      ? 'Z-Score BB/U (Berat Badan / Umur - Underweight)'
      : 'Z-Score BB/TB (Berat Badan / Tinggi Badan - Wasting)';

  const clinicalInterpretation =
    activeTab === 'tbu'
      ? 'Nilai Z-score < -2 SD mengindikasikan stunting (pendek/sangat pendek) berdasarkan standar baku antropometri WHO Child Growth Standards. Batang merah dan oranye (< -2 SD) merupakan kelompok prioritas intervensi penanganan stunting.'
      : activeTab === 'bbu'
      ? 'Nilai Z-score < -2 SD mengindikasikan berat badan kurang (underweight). Indikator ini mencerminkan kombinasi defisit gizi masa lalu (kronis) dan kondisi saat ini (akut).'
      : 'Nilai Z-score < -2 SD mengindikasikan wasting (gizi kurang/buruk akut), sedangkan nilai > +2 SD mengindikasikan risiko gizi lebih atau obesitas.';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100/80 flex items-center justify-center text-teal-600 shadow-2xs">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-800 tracking-tight">
              Distribusi Nilai Numerik Z-Score Antropometri
            </h3>
            <p className="text-[12.5px] text-slate-500 mt-0.5 leading-snug">
              Distribusi frekuensi simpangan baku (Standard Deviation Score) berdasarkan kurva baku WHO
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('tbu')}
            className={`px-3 py-1.5 text-[12px] rounded-md transition-colors font-semibold ${
              activeTab === 'tbu'
                ? 'bg-white shadow-xs text-teal-700'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ZS TB/U (Stunting)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bbu')}
            className={`px-3 py-1.5 text-[12px] rounded-md transition-colors font-semibold ${
              activeTab === 'bbu'
                ? 'bg-white shadow-xs text-teal-700'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ZS BB/U (Underweight)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bbtb')}
            className={`px-3 py-1.5 text-[12px] rounded-md transition-colors font-semibold ${
              activeTab === 'bbtb'
                ? 'bg-white shadow-xs text-teal-700'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ZS BB/TB (Wasting)
          </button>
        </div>
      </div>

      {/* Konten Tab Aktif */}
      {!currentStats.has_column ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-300 min-h-[280px] space-y-2">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-2xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-[14.5px] font-bold text-slate-800">Kolom Z-Score Belum Tersedia</h4>
          <p className="text-[12.5px] text-slate-500 max-w-sm leading-relaxed">
            {currentStats.unmapped_reason ||
              'Nilai numerik Z-score untuk indikator ini belum dipetakan dalam dataset.'}
          </p>
        </div>
      ) : currentStats.count_valid === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-300 min-h-[280px]">
          <p className="text-[13px] text-slate-500">
            {currentStats.unmapped_reason || 'Tidak ada nilai z-score numerik valid yang ditemukan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stat Cards (Valid, Mean, Median, Min, Max) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 text-center">
              <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Sampel Valid (N)
              </span>
              <span className="text-[22px] lg:text-[24px] font-bold text-slate-900 font-mono tracking-tight">
                {currentStats.count_valid.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 text-center">
              <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Rata-rata (Mean)
              </span>
              <span className="text-[22px] lg:text-[24px] font-bold text-slate-900 font-mono tracking-tight">
                {currentStats.mean ?? '-'}
              </span>
              <span className="text-[10.5px] text-slate-400 block font-medium">SD</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 text-center">
              <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Median (P50)
              </span>
              <span className="text-[22px] lg:text-[24px] font-bold text-slate-900 font-mono tracking-tight">
                {currentStats.median ?? '-'}
              </span>
              <span className="text-[10.5px] text-slate-400 block font-medium">SD</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 text-center">
              <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Skor Terendah
              </span>
              <span className="text-[22px] lg:text-[24px] font-bold text-rose-700 font-mono tracking-tight">
                {currentStats.min_value ?? '-'}
              </span>
              <span className="text-[10.5px] text-rose-400 block font-medium">SD</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 text-center col-span-2 sm:col-span-1">
              <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Skor Tertinggi
              </span>
              <span className="text-[22px] lg:text-[24px] font-bold text-emerald-700 font-mono tracking-tight">
                {currentStats.max_value ?? '-'}
              </span>
              <span className="text-[10.5px] text-emerald-400 block font-medium">SD</span>
            </div>
          </div>

          {/* Histogram Bar Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[13px] font-bold text-slate-700 px-1">
              <span>Distribusi Frekuensi per Rentang Baku WHO (Standard Deviation)</span>
              <span className="font-mono text-slate-500 text-[12px] font-medium">
                {indicatorLabel}
              </span>
            </div>

            <div className="h-[280px] lg:h-[300px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={currentStats.distribution}
                  margin={{ top: 16, right: 16, left: -10, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 13, fill: '#334155', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 13,
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      padding: '10px 14px',
                    }}
                    formatter={(val, _name, item) => [
                      `${val ?? 0} balita (${(item.payload as DistributionItem).percentage}%)`,
                      'Jumlah Balita',
                    ]}
                    labelStyle={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={44}>
                    {currentStats.distribution.map((entry) => (
                      <Cell
                        key={`zscore-cell-${entry.category}`}
                        fill={ZSCORE_BIN_COLORS[entry.category] || '#0d9488'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Edukasi Klinis Interprestasi WHO */}
          <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-[14px] text-teal-950 flex items-start gap-3.5 leading-relaxed">
            <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-teal-900 block mb-0.5">
                Interpretasi Klinis Baku WHO:
              </span>
              <p className="text-teal-800/90">{clinicalInterpretation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
