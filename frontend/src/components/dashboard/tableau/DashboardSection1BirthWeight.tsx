import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import { Scale, AlertCircle, FileSpreadsheet } from 'lucide-react';
import type { DashboardSection1BirthWeight as Section1Data } from '../../../types/dashboard';
import { DashboardBoxPlotVisual } from './DashboardBoxPlotVisual';

interface DashboardSection1BirthWeightProps {
  data: Section1Data;
  onGoToDataBalita: () => void;
}

export const DashboardSection1BirthWeight: React.FC<DashboardSection1BirthWeightProps> = ({
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
              Bagian 1: Pengaruh Berat Lahir terhadap Risiko Stunting
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {data.unmapped_reason ||
                'Kolom berat lahir (kg) belum teridentifikasi atau belum dipetakan pada dataset aktif.'}
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

  // Siapkan data bar chart prevalensi
  const barData = data.categories.map((c) => ({
    name: c.category,
    stunting_rate: c.stunting_rate,
    total: c.total_count,
    stunting_count: c.stunting_count,
    normal_count: c.normal_count,
  }));

  // Scatter plot points (warna berbeda untuk stunting vs normal)
  const scatterStunting = data.scatter_sample.filter((p) => p.is_stunting);
  const scatterNormal = data.scatter_sample.filter((p) => !p.is_stunting);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bagian 1: Pengaruh Berat Lahir terhadap Risiko Stunting
            </h3>
            <p className="text-xs text-slate-500">
              Analisis berat lahir rendah (BBLR &lt; 2,5 kg) dan korelasinya terhadap Z-Score TB/U
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 w-fit">
          Valid: {data.total_valid.toLocaleString('id-ID')} balita
        </span>
      </div>

      {/* 2 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-xs text-slate-500 font-medium">Prevalensi BBLR (&lt; 2,5 kg)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900">
              {data.bblr_rate_overall.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">
              ({data.bblr_count.toLocaleString('id-ID')} balita)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Proporsi BBLR dari seluruh catatan balita valid</p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70">
          <span className="text-xs text-amber-800 font-medium">% BBLR yang Mengalami Stunting</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-amber-700">
              {data.bblr_stunting_rate.toFixed(1)}%
            </span>
            <span className="text-xs text-amber-800">
              ({data.bblr_stunting_count.toLocaleString('id-ID')} kasus)
            </span>
          </div>
          <p className="text-[11px] text-amber-700/80 mt-1">
            {data.normal_stunting_rate > 0
              ? `Bandingkan dengan non-BBLR yang stunting: ${data.normal_stunting_rate.toFixed(1)}%`
              : 'Risiko stunting pada bayi dengan riwayat BBLR'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 sm:col-span-2 lg:col-span-1">
          <span className="text-xs text-slate-500 font-medium">Rata-rata Berat Lahir</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900">
              {data.mean_birth_weight !== null && data.mean_birth_weight !== undefined
                ? `${data.mean_birth_weight.toFixed(2)} kg`
                : '-'}
            </span>
            <span className="text-xs text-slate-500">
              (Batas Normal: &ge; 2,5 kg)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Distribusi berat lahir seluruh balita terdata</p>
        </div>
      </div>

      {/* Bar Chart & Box Plot (2 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Box Plot Berat Lahir (Stunting vs Normal) */}
        <DashboardBoxPlotVisual
          title="Distribusi Berat Lahir: Stunting vs Tidak Stunting"
          unit="kg"
          thresholdLine={{
            value: 2.5,
            label: 'Ambang Batas BBLR (2,5 kg)',
            color: '#ef4444',
          }}
          items={[
            {
              label: 'Balita Stunting (TB/U < -2 SD)',
              color: '#d97706',
              stats: data.boxplot_stunting,
            },
            {
              label: 'Balita Normal / Tidak Stunting',
              color: '#059669',
              stats: data.boxplot_normal,
            },
          ]}
        />

        {/* Bar Chart Prevalensi Stunting: BBLR vs Normal */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Prevalensi Stunting Berdasarkan Kategori Berat Lahir
              </h4>
              <p className="text-[11px] text-slate-400">
                Perbandingan persentase stunting balita BBLR vs Normal
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                <Tooltip
                  formatter={(val: any, _name: any, item: any) => [
                    `${Number(val).toFixed(1)}% (${item.payload.stunting_count} dari ${item.payload.total} balita)`,
                    'Prevalensi Stunting',
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="stunting_rate"
                  name="% Prevalensi Stunting"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scatter Plot Berat Lahir vs Z-score TB/U (Lebar Penuh) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-slate-100 pb-2 gap-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Korelasi Titik: Berat Lahir (kg) vs Nilai Z-Score TB/U
            </h4>
            <p className="text-[11px] text-slate-400">
              Garis horizontal merah menunjukkan batas stunting (-2 SD), garis vertikal oranye menunjukkan batas BBLR (2,5 kg).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Stunting (TB/U &lt; -2)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Normal (&ge; -2)
            </span>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 20, bottom: 15, left: -5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                dataKey="x"
                name="Berat Lahir"
                unit=" kg"
                domain={['auto', 'auto']}
                tick={{ fontSize: 11 }}
                label={{ value: 'Berat Lahir (kg)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Z-Score TB/U"
                unit=" SD"
                domain={[-6, 6]}
                tick={{ fontSize: 11 }}
                label={{ value: 'Z-Score TB/U (SD)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs p-2 rounded-lg shadow-lg">
                        <p className="font-semibold">{dataPoint.label || 'Sampel Balita'}</p>
                        <p>Berat Lahir: <strong>{dataPoint.x.toFixed(2)} kg</strong></p>
                        <p>Z-Score TB/U: <strong>{dataPoint.y.toFixed(2)} SD</strong></p>
                        <p className={dataPoint.is_stunting ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                          Status: {dataPoint.is_stunting ? 'Stunting' : 'Normal'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Reference Lines */}
              <ReferenceLine y={-2} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Batas Stunting (-2 SD)', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} />
              <ReferenceLine x={2.5} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Batas BBLR (2,5 kg)', fill: '#d97706', fontSize: 10, position: 'insideTopRight' }} />
              <Scatter name="Stunting" data={scatterStunting} fill="#d97706" opacity={0.6} />
              <Scatter name="Normal" data={scatterNormal} fill="#059669" opacity={0.4} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

