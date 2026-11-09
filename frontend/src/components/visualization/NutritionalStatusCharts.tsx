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
  PieChart,
  Pie,
} from 'recharts';
import { Ruler, Weight, Activity, BarChart2, PieChart as PieIcon, AlertCircle } from 'lucide-react';
import type { DistributionItem } from '../../types/visualization';

// Palet warna status antropometri standar Kemenkes RI / WHO
const TBU_COLOR_MAP: Record<string, string> = {
  'sangat pendek': '#dc2626', // Red-600
  'severely stunted': '#dc2626',
  'pendek': '#f59e0b', // Amber-500
  'stunted': '#f59e0b',
  'normal': '#10b981', // Emerald-500
  'tinggi': '#0284c7', // Sky-600
  'tall': '#0284c7',
};

const BBU_COLOR_MAP: Record<string, string> = {
  'berat badan sangat kurang': '#e11d48', // Rose-600
  'sangat kurang': '#e11d48',
  'severely underweight': '#e11d48',
  'berat badan kurang': '#ea580c', // Orange-600
  'kurang': '#ea580c',
  'underweight': '#ea580c',
  'berat badan normal': '#059669', // Emerald-600
  'normal': '#059669',
  'risiko berat badan lebih': '#6366f1', // Indigo-500
  'risiko lebih': '#6366f1',
  'lebih': '#6366f1',
};

const BBTB_COLOR_MAP: Record<string, string> = {
  'gizi buruk': '#b91c1c', // Red-700
  'severely wasted': '#b91c1c',
  'gizi kurang': '#f97316', // Orange-500
  'wasted': '#f97316',
  'gizi baik': '#10b981', // Emerald-500
  'normal': '#10b981',
  'berisiko gizi lebih': '#0284c7', // Sky-600
  'gizi lebih': '#3b82f6', // Blue-500
  'overweight': '#3b82f6',
  'obesitas': '#7c3aed', // Violet-600
  'obese': '#7c3aed',
};

const FALLBACK_PALETTE = ['#0d9488', '#2563eb', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899'];

function getColor(label: string, map: Record<string, string>, index: number): string {
  const clean = label.trim().toLowerCase();
  for (const key of Object.keys(map)) {
    if (clean.includes(key)) {
      return map[key];
    }
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

interface SingleStatusCardProps {
  title: string;
  badgeLabel: string;
  badgeColorClass: string;
  description: string;
  icon: React.ReactNode;
  hasColumn: boolean;
  unmappedReason?: string | null;
  data: DistributionItem[];
  colorMap: Record<string, string>;
  clinicalNote: string;
}

const SingleStatusCard: React.FC<SingleStatusCardProps> = ({
  title,
  badgeLabel,
  badgeColorClass,
  description,
  icon,
  hasColumn,
  unmappedReason,
  data,
  colorMap,
  clinicalNote,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'donut'>('bar');
  const totalCount = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 shadow-2xs">
              {icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-bold text-slate-800 leading-tight">
                  {title}
                </h3>
                <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full ${badgeColorClass}`}>
                  {badgeLabel}
                </span>
              </div>
              <p className="text-[12.5px] text-slate-500 mt-0.5 leading-snug">
                {description}
              </p>
            </div>
          </div>

          {/* Toggle Bar / Donut */}
          {hasColumn && data.length > 0 && (
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 flex-shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`p-2 rounded-lg text-xs transition-colors ${
                  chartType === 'bar'
                    ? 'bg-white shadow-xs text-teal-600 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Tampilkan diagram batang"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setChartType('donut')}
                className={`p-2 rounded-lg text-xs transition-colors ${
                  chartType === 'donut'
                    ? 'bg-white shadow-xs text-teal-600 font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Tampilkan diagram lingkaran"
              >
                <PieIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!hasColumn ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 my-2 space-y-3 min-h-[320px]">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-2xs">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h4 className="text-[15px] font-bold text-slate-800">Variabel Tidak Tersedia</h4>
          <p className="text-[13px] text-slate-500 max-w-sm leading-relaxed">
            {unmappedReason || 'Kolom ini belum dipetakan dalam dataset yang diunggah.'}
          </p>
          <span className="text-[12px] font-medium text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            Buka menu Data Balita untuk memetakan kolom ini
          </span>
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 my-2 space-y-2 min-h-[320px]">
          <p className="text-[14px] font-medium text-slate-600">Tidak ada data untuk kombinasi filter ini.</p>
          <p className="text-[12px] text-slate-400">Silakan sesuaikan pilihan pada panel filter di atas.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Chart Graphic Area */}
          <div className="h-[280px] lg:h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  data={data}
                  margin={{ top: 16, right: 16, left: -10, bottom: 28 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    interval={0}
                    angle={-14}
                    textAnchor="end"
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
                      'Frekuensi',
                    ]}
                    labelStyle={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={38}>
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.category}-${index}`}
                        fill={getColor(entry.category, colorMap, index)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart margin={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`donut-cell-${entry.category}-${index}`}
                        fill={getColor(entry.category, colorMap, index)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 13,
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      padding: '10px 14px',
                    }}
                    formatter={(val, name, item) => [
                      `${val ?? 0} balita (${(item.payload as DistributionItem).percentage}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Rincian Kategori Tabel / Legend */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[12px] font-bold text-slate-500 uppercase tracking-wider px-1">
              <span>Kategori Status</span>
              <span>Jumlah & Proporsi</span>
            </div>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {data.map((item, idx) => {
                const color = getColor(item.category, colorMap, idx);
                return (
                  <div
                    key={item.category}
                    className="flex items-center justify-between text-[13px] py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-md flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium text-slate-700 truncate capitalize">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                      <span className="font-semibold text-slate-900">
                        {item.count.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[12px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info Klinis */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500">
        <span className="font-medium text-slate-600 truncate">{clinicalNote}</span>
        {hasColumn && data.length > 0 && (
          <span className="font-mono text-slate-600 font-semibold flex-shrink-0 ml-2">
            N = {totalCount.toLocaleString('id-ID')} balita
          </span>
        )}
      </div>
    </div>
  );
};

interface NutritionalStatusChartsProps {
  hasStatusTbu: boolean;
  statusTbuDistribution: DistributionItem[];
  statusTbuUnmappedReason?: string | null;

  hasStatusBbu: boolean;
  statusBbuDistribution: DistributionItem[];
  statusBbuUnmappedReason?: string | null;

  hasStatusBbtb: boolean;
  statusBbtbDistribution: DistributionItem[];
  statusBbtbUnmappedReason?: string | null;
}

export const NutritionalStatusCharts: React.FC<NutritionalStatusChartsProps> = ({
  hasStatusTbu,
  statusTbuDistribution,
  statusTbuUnmappedReason,
  hasStatusBbu,
  statusBbuDistribution,
  statusBbuUnmappedReason,
  hasStatusBbtb,
  statusBbtbDistribution,
  statusBbtbUnmappedReason,
}) => {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[20px] lg:text-[22px] font-bold text-slate-900 tracking-tight">
          Distribusi Status Gizi & Antropometri Balita
        </h3>
        <p className="text-[14px] text-slate-500 mt-1 leading-relaxed">
          Tiga indeks antropometri standar Kemenkes RI/WHO: Stunting diukur melalui indikator TB/U, Underweight melalui BB/U, dan Wasting melalui BB/TB.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-7">
        {/* 1. TB/U - Stunting */}
        <SingleStatusCard
          title="Distribusi Status TB/U"
          badgeLabel="Indikator Stunting"
          badgeColorClass="bg-rose-50 text-rose-700 border border-rose-200"
          description="Tinggi Badan menurut Umur (Defisit Kronis)"
          icon={<Ruler className="w-5 h-5 text-rose-600" />}
          hasColumn={hasStatusTbu}
          unmappedReason={statusTbuUnmappedReason}
          data={statusTbuDistribution}
          colorMap={TBU_COLOR_MAP}
          clinicalNote="Indikator resmi diagnosis stunting WHO"
        />

        {/* 2. BB/U - Underweight */}
        <SingleStatusCard
          title="Distribusi Status BB/U"
          badgeLabel="Berat menurut Umur"
          badgeColorClass="bg-blue-50 text-blue-700 border border-blue-200"
          description="Berat Badan menurut Umur (Gizi Akut & Kronis)"
          icon={<Weight className="w-5 h-5 text-blue-600" />}
          hasColumn={hasStatusBbu}
          unmappedReason={statusBbuUnmappedReason}
          data={statusBbuDistribution}
          colorMap={BBU_COLOR_MAP}
          clinicalNote="Indikator berat kurang (Underweight)"
        />

        {/* 3. BB/TB - Wasting */}
        <SingleStatusCard
          title="Distribusi Status BB/TB"
          badgeLabel="Indikator Wasting"
          badgeColorClass="bg-amber-50 text-amber-700 border border-amber-200"
          description="Berat Badan menurut Tinggi Badan (Defisit Akut)"
          icon={<Activity className="w-5 h-5 text-amber-600" />}
          hasColumn={hasStatusBbtb}
          unmappedReason={statusBbtbUnmappedReason}
          data={statusBbtbDistribution}
          colorMap={BBTB_COLOR_MAP}
          clinicalNote="Indikator gizi buruk / kurus akut"
        />
      </div>
    </div>
  );
};
