import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import { Users, AlertCircle, FileSpreadsheet } from 'lucide-react';
import type { DashboardSection5MaternalFactors as Section5Data } from '../../../types/dashboard';

interface DashboardSection5MaternalFactorsProps {
  data: Section5Data;
  onGoToDataBalita: () => void;
}

export const DashboardSection5MaternalFactors: React.FC<DashboardSection5MaternalFactorsProps> = ({
  data,
  onGoToDataBalita,
}) => {
  const hasEitherData = data.has_lila || data.bblr_categories.length > 0 || data.has_panjang_lahir;

  if (!hasEitherData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-800">
              Bagian 5: Hubungan Faktor Ibu dan Kondisi Kelahiran terhadap Stunting
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Data faktor maternal (LiLA ibu hamil, panjang lahir) belum tersedia pada dataset aktif.
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

  const lilaBarData = data.lila_categories.map((c) => ({
    name: c.category,
    stunting_rate: c.stunting_rate,
    total: c.total_count,
    stunting_count: c.stunting_count,
  }));

  const bblrBarData = data.bblr_categories.map((c) => ({
    name: c.category,
    stunting_rate: c.stunting_rate,
    total: c.total_count,
    stunting_count: c.stunting_count,
  }));

  const scatterStunting = data.scatter_panjang_sample.filter((p) => p.is_stunting);
  const scatterNormal = data.scatter_panjang_sample.filter((p) => !p.is_stunting);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bagian 5: Hubungan Faktor Ibu dan Kondisi Kelahiran terhadap Stunting
            </h3>
            <p className="text-xs text-slate-500">
              Pengaruh status gizi ibu (LiLA &lt; 23,5 cm KEK), berat lahir, dan panjang badan lahir
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 w-fit">
          Determinan Maternal & Kelahiran
        </span>
      </div>

      {/* 2 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
          <span className="text-xs text-purple-900 font-medium">Ibu Hamil Berisiko KEK (LiLA &lt; 23,5 cm)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-purple-950">
              {data.kek_risk_rate !== null && data.kek_risk_rate !== undefined
                ? `${data.kek_risk_rate.toFixed(1)}%`
                : 'Belum Ada Data'}
            </span>
          </div>
          <p className="text-[11px] text-purple-800/80 mt-1">
            {data.has_lila
              ? 'Proporsi balita dari ibu dengan indikasi Kurang Energi Kronis (KEK)'
              : data.lila_unmapped_reason || 'Memerlukan kolom LiLA ibu'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
          <span className="text-xs text-amber-900 font-medium">Balita Riwayat BBLR (&lt; 2,5 kg)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-amber-950">
              {data.bblr_rate_overall.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-amber-800 mt-1">
            Persentase balita yang lahir dengan berat badan rendah
          </p>
        </div>
      </div>

      {/* 2 Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart LiLA Ibu */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Prevalensi Stunting vs Status LiLA Ibu
              </h4>
              <p className="text-[11px] text-slate-400">
                Perbandingan balita stunting dari ibu Normal (&ge; 23,5 cm) vs Berisiko KEK (&lt; 23,5 cm)
              </p>
            </div>
          </div>
          {data.has_lila && lilaBarData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lilaBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                  <Bar
                    dataKey="stunting_rate"
                    name="% Stunting"
                    fill="#a855f7"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 text-center">
              <span>{data.lila_unmapped_reason || 'Data Lingkar Lengan Atas (LiLA) ibu belum dipetakan.'}</span>
              <button
                onClick={onGoToDataBalita}
                className="mt-2 text-teal-600 hover:underline cursor-pointer"
              >
                Petakan kolom di Data Balita
              </button>
            </div>
          )}
        </div>

        {/* Bar Chart BBLR vs Normal */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Prevalensi Stunting vs Berat Lahir
              </h4>
              <p className="text-[11px] text-slate-400">
                Perbandingan anak stunting: Riwayat BBLR (&lt; 2,5 kg) vs Berat Normal
              </p>
            </div>
          </div>
          {bblrBarData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bblrBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                  <Bar
                    dataKey="stunting_rate"
                    name="% Stunting"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 text-center">
              <span>Data perbandingan berat lahir belum tersedia.</span>
            </div>
          )}
        </div>
      </div>

      {/* Scatter Plot Panjang Lahir vs Z-Score TB/U */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-slate-100 pb-2 gap-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Korelasi Titik: Panjang Badan Lahir (cm) vs Z-Score TB/U
            </h4>
            <p className="text-[11px] text-slate-400">
              Menilai apakah panjang badan saat lahir berkorelasi linear dengan status tinggi badan saat ini
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

        {data.has_panjang_lahir && data.scatter_panjang_sample.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 20, bottom: 15, left: -5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Panjang Lahir"
                  unit=" cm"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Panjang Lahir (cm)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }}
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
                          <p>Panjang Lahir: <strong>{dataPoint.x.toFixed(1)} cm</strong></p>
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
                <ReferenceLine
                  y={-2}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: 'Batas Stunting (-2 SD)', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }}
                />
                <ReferenceLine
                  x={48}
                  stroke="#6366f1"
                  strokeDasharray="4 4"
                  label={{ value: 'Standar Panjang Lahir (48 cm)', fill: '#6366f1', fontSize: 10, position: 'insideTopRight' }}
                />
                <Scatter name="Stunting" data={scatterStunting} fill="#d97706" opacity={0.6} />
                <Scatter name="Normal" data={scatterNormal} fill="#059669" opacity={0.4} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 text-center">
            <span>{data.panjang_lahir_unmapped_reason || 'Data panjang badan lahir (cm) belum dipetakan.'}</span>
            <button
              onClick={onGoToDataBalita}
              className="mt-2 text-teal-600 hover:underline cursor-pointer"
            >
              Petakan kolom di Data Balita
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
