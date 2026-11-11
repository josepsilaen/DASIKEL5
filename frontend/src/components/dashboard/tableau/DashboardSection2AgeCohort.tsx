import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Calendar, AlertCircle, FileSpreadsheet, TrendingDown, Award } from 'lucide-react';
import type { DashboardSection2AgeCohort as Section2Data } from '../../../types/dashboard';
import { DashboardBoxPlotVisual } from './DashboardBoxPlotVisual';

interface DashboardSection2AgeCohortProps {
  data: Section2Data;
  onGoToDataBalita: () => void;
}

export const DashboardSection2AgeCohort: React.FC<DashboardSection2AgeCohortProps> = ({
  data,
  onGoToDataBalita,
}) => {
  if (!data.has_column) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-800">
              Bagian 2: Jumlah Stunting Berdasarkan Kelompok Usia
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {data.unmapped_reason ||
                'Kolom usia balita (bulan) belum teridentifikasi atau belum dipetakan pada dataset aktif.'}
            </p>
            <button
              onClick={onGoToDataBalita}
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              Petakan Kolom di Data Balita
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Siapkan data grafik
  const chartData = data.cohorts.map((c) => ({
    cohort: c.cohort_label,
    stunting_rate: c.stunting_rate,
    stunting_count: c.stunting_count,
    total_count: c.total_count,
    mean_zscore: c.mean_zscore_tbu,
  }));

  // Box plot per kohor usia
  const boxPlotItems = data.cohorts.map((c, idx) => {
    const colors = ['#0284c7', '#0d9488', '#16a34a', '#ca8a04', '#ea580c', '#e11d48'];
    return {
      label: c.cohort_label,
      color: colors[idx % colors.length],
      stats: c.boxplot,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bagian 2: Jumlah Stunting Berdasarkan Kelompok Usia
            </h3>
            <p className="text-xs text-slate-500">
              Analisis kohor usia baku (0–5, 6–11, 12–23, 24–35, 36–47, 48–59 bulan) dan dinamika Z-Score TB/U
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 w-fit">
          6 Kelompok Usia Baku
        </span>
      </div>

      {/* 2 KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start justify-between">
          <div>
            <span className="text-xs text-amber-800 font-medium">Prevalensi Stunting Tertinggi</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-900">
                {data.highest_stunting_cohort || '-'}
              </span>
              {data.highest_stunting_rate !== null && data.highest_stunting_rate !== undefined && (
                <span className="text-sm font-bold text-amber-700">
                  ({data.highest_stunting_rate.toFixed(1)}%)
                </span>
              )}
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              Kelompok usia paling rentan terhadap kejadian gagal tumbuh
            </p>
          </div>
          <div className="p-2 rounded-lg bg-amber-200/70 text-amber-800">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
          <div>
            <span className="text-xs text-slate-600 font-medium">Rata-rata Z-Score TB/U Terendah</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {data.lowest_mean_zscore_cohort || '-'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Menunjukkan defisit linier tinggi badan kumulatif paling berat
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-200 text-slate-700">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2 Kolom Grafik: Bar Chart Prevalensi & Line Chart Rata-rata Z-Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart Prevalensi Stunting per Usia */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Prevalensi Stunting (%) per Kelompok Usia
              </h4>
              <p className="text-[11px] text-slate-400">
                Proporsi balita stunting di masing-masing tahapan usia
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                <Tooltip
                  formatter={(val: any, _name: any, item: any) => [
                    `${Number(val).toFixed(1)}% (${item.payload.stunting_count} dari ${item.payload.total_count} balita)`,
                    'Prevalensi Stunting',
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar
                  dataKey="stunting_rate"
                  name="% Prevalensi Stunting"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart Rata-rata Z-Score TB/U per Usia */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Rata-rata Z-Score TB/U per Kelompok Usia
              </h4>
              <p className="text-[11px] text-slate-400">
                Tren penurunan kurva tinggi badan terhadap standar baku WHO
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
                <YAxis domain={[-3, 1]} tick={{ fontSize: 11 }} unit=" SD" />
                <Tooltip
                  formatter={(val: any) => [
                    val !== null && val !== undefined ? `${Number(val).toFixed(2)} SD` : '-',
                    'Rata-rata Z-Score TB/U',
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <ReferenceLine
                  y={-2}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: 'Batas Stunting (-2 SD)', fill: '#ef4444', fontSize: 10, position: 'insideBottomLeft' }}
                />
                <Line
                  type="monotone"
                  dataKey="mean_zscore"
                  name="Mean Z-Score TB/U"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#4f46e5' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Box Plot Distribusi Z-score TB/U per Kelompok Usia */}
      <DashboardBoxPlotVisual
        title="Distribusi Sebaran Nilai Z-Score TB/U per Kelompok Usia (6 Kohor)"
        unit="SD"
        thresholdLine={{
          value: -2.0,
          label: 'Garis Batas Stunting (-2,0 SD)',
          color: '#ef4444',
        }}
        items={boxPlotItems}
      />
    </div>
  );
};

