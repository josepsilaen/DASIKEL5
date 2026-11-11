import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  MapPin,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  BarChart2,
  Filter,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import type { DashboardSection3RegionalSpread as Section3Data } from '../../../types/dashboard';

interface DashboardSection3RegionalSpreadProps {
  data: Section3Data;
  selectedDesa: string | null;
  onSelectDesa: (desaName: string) => void;
  onGoToDataBalita: () => void;
}

export const DashboardSection3RegionalSpread: React.FC<DashboardSection3RegionalSpreadProps> = ({
  data,
  selectedDesa,
  onSelectDesa,
  onGoToDataBalita,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!data.has_column || data.all_desas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-800">
              Bagian 3: Sebaran Stunting Berdasarkan Wilayah
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {data.unmapped_reason ||
                'Kolom desa/kelurahan belum teridentifikasi atau belum dipetakan pada dataset aktif.'}
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

  // Filter desa berdasarkan kata kunci pencarian
  const filteredDesas = data.all_desas.filter((d) =>
    d.desa_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.kecamatan && d.kecamatan.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getColorByRate = (rate: number, isSelected: boolean) => {
    if (isSelected) return 'bg-teal-600 text-white ring-2 ring-teal-400 ring-offset-2';
    if (rate >= 30) return 'bg-rose-500 hover:bg-rose-600 text-white';
    if (rate >= 20) return 'bg-amber-500 hover:bg-amber-600 text-white';
    if (rate >= 10) return 'bg-amber-300 hover:bg-amber-400 text-amber-950';
    return 'bg-emerald-400 hover:bg-emerald-500 text-emerald-950';
  };

  const top10Data = [...data.top_10_high_stunting_desas].reverse().map((d) => ({
    name: d.desa_name.length > 14 ? `${d.desa_name.substring(0, 12)}...` : d.desa_name,
    fullName: d.desa_name,
    stunting_rate: d.stunting_rate,
    stunting_count: d.stunting_count,
    total_balita: d.total_balita,
    isAboveAvg: d.is_above_avg,
    isSelected: selectedDesa === d.desa_name,
  }));

  // Total balita untuk perhitungan treemap
  const totalBalitaAll = data.all_desas.reduce((acc, cur) => acc + cur.total_balita, 0) || 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bagian 3: Sebaran Stunting Berdasarkan Wilayah
            </h3>
            <p className="text-xs text-slate-500">
              Peta sebaran desa, Treemap proporsional, dan Top 10 desa prioritas penanganan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800">
            {data.total_desas_count} Desa Tercakup
          </span>
          {selectedDesa && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 text-white flex items-center gap-1">
              <Filter className="w-3 h-3 text-teal-400" />
              Aktif: {selectedDesa}
            </span>
          )}
        </div>
      </div>

      {/* KPI Highlight Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start justify-between">
          <div>
            <span className="text-xs text-amber-800 font-medium">Desa di Atas Rata-rata</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-900">
                {data.desas_above_avg_count}
              </span>
              <span className="text-xs text-amber-800">
                dari {data.total_desas_count} desa ({((data.desas_above_avg_count / (data.total_desas_count || 1)) * 100).toFixed(0)}%)
              </span>
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              Desa dengan prevalensi melampaui angka rata-rata kabupaten
            </p>
          </div>
          <div className="p-2 rounded-lg bg-amber-200/70 text-amber-800">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
          <div>
            <span className="text-xs text-slate-600 font-medium">Rata-rata Prevalensi Desa</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {data.avg_desa_stunting_rate.toFixed(1)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Garis ambang komparasi performa antar-desa
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-200 text-slate-700">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex items-start justify-between">
          <div>
            <span className="text-xs text-teal-800 font-medium">Interaksi Filter Antar-Visualisasi</span>
            <div className="mt-1">
              <span className="text-xs text-teal-900 font-semibold block">
                {selectedDesa ? `Memfilter data Desa ${selectedDesa}` : 'Klik desa mana saja'}
              </span>
              <span className="text-[11px] text-teal-700">
                Otomatis memperbarui Bagian 1, 2, 4, dan 5
              </span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-teal-200/70 text-teal-800">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2 Kolom: Peta Grid Choropleth Interaktif & Top 10 Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Peta Choropleth Interaktif (Grid Matrix Desa) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-slate-100 pb-2 gap-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  Peta Choropleth Desa Interaktif
                </h4>
                <p className="text-[11px] text-slate-400">
                  Klik petak desa untuk memfilter seluruh dashboard (Tableau Action)
                </p>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari desa..."
                className="text-xs px-2.5 py-1 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-teal-500 w-36"
              />
            </div>

            {/* Skala Warna Choropleth */}
            <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-3 bg-slate-50 p-2 rounded-lg">
              <span className="font-medium text-slate-600">Prevalensi:</span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 inline-block" /> &lt;10%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-300 inline-block" /> 10–20%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" /> 20–30%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> &gt;30%
              </span>
            </div>

            {/* Grid Petak Desa */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
              {filteredDesas.map((desa) => {
                const isSelected = selectedDesa === desa.desa_name;
                const colorClass = getColorByRate(desa.stunting_rate, isSelected);

                return (
                  <button
                    key={desa.desa_name}
                    type="button"
                    onClick={() => onSelectDesa(desa.desa_name)}
                    className={`p-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer shadow-2xs flex flex-col justify-between ${colorClass}`}
                    title={`${desa.desa_name}: ${desa.stunting_rate.toFixed(1)}% stunting (${desa.stunting_count}/${desa.total_balita} balita)`}
                  >
                    <span className="font-semibold text-xs leading-tight line-clamp-1">
                      {desa.desa_name}
                    </span>
                    <div className="mt-1.5 flex items-baseline justify-between text-[11px] opacity-90">
                      <span>{desa.stunting_rate.toFixed(1)}%</span>
                      <span className="text-[10px]">N={desa.total_balita}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between items-center">
            <span>Menampilkan {filteredDesas.length} dari {data.total_desas_count} desa</span>
            {selectedDesa && (
              <span className="text-teal-700 font-medium">Klik kembali untuk tetap memfilter</span>
            )}
          </div>
        </div>

        {/* Horizontal Bar Chart Top 10 Desa */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Top 10 Desa Prevalensi Stunting Tertinggi
              </h4>
              <p className="text-[11px] text-slate-400">
                Klik salah satu bar desa untuk memfilter analisis lainnya
              </p>
            </div>
            <span className="text-[10px] text-slate-400">
              Avg: {data.avg_desa_stunting_rate.toFixed(1)}%
            </span>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top10Data}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" unit="%" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={85}
                />
                <Tooltip
                  formatter={(val: any, _name: any, item: any) => [
                    `${Number(val).toFixed(1)}% (${item.payload.stunting_count} stunting dari ${item.payload.total_balita} balita)`,
                    `Desa: ${item.payload.fullName}`,
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <ReferenceLine
                  x={data.avg_desa_stunting_rate}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: 'Rata-rata', fill: '#ef4444', fontSize: 10, position: 'top' }}
                />
                <Bar
                  dataKey="stunting_rate"
                  name="Prevalensi Stunting"
                  fill="#f43f5e"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={18}
                  onClick={(entry: any) => {
                    if (entry && entry.fullName) {
                      onSelectDesa(entry.fullName);
                    }
                  }}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Treemap Proporsional Desa (Ukuran = Balita, Warna = Prevalensi %) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-slate-100 pb-2 gap-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              Treemap Proporsional Beban Kasus Desa
            </h4>
            <p className="text-[11px] text-slate-400">
              Luas kotak sebanding dengan populasi balita; warna merepresentasikan tingkat prevalensi stunting. Klik kotak desa untuk memfilter.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Total Balita: <strong>{totalBalitaAll.toLocaleString('id-ID')}</strong>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl max-h-56 overflow-y-auto">
          {data.all_desas.map((desa) => {
            const isSelected = selectedDesa === desa.desa_name;
            const weightPercent = (desa.total_balita / totalBalitaAll) * 100;
            // Flex basis proporsional (min 90px, max 260px)
            const flexBasis = Math.max(90, Math.min(260, Math.round(weightPercent * 25) + 90));
            const colorClass = getColorByRate(desa.stunting_rate, isSelected);

            return (
              <button
                key={desa.desa_name}
                type="button"
                onClick={() => onSelectDesa(desa.desa_name)}
                style={{ flexGrow: Math.max(1, Math.round(weightPercent)), flexBasis: `${flexBasis}px` }}
                className={`p-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer shadow-2xs flex flex-col justify-between ${colorClass}`}
                title={`Desa ${desa.desa_name} | Populasi: ${desa.total_balita} balita (${weightPercent.toFixed(1)}%) | Stunting: ${desa.stunting_rate.toFixed(1)}%`}
              >
                <div className="flex justify-between items-start gap-1">
                  <span className="font-semibold text-xs leading-tight line-clamp-1">
                    {desa.desa_name}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-white shrink-0 mt-0.5" />
                  )}
                </div>
                <div className="mt-1 flex items-baseline justify-between text-[11px] opacity-90">
                  <span className="font-bold">{desa.stunting_rate.toFixed(1)}%</span>
                  <span className="text-[10px]">{desa.total_balita} anak</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
