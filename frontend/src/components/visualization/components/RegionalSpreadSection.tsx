import React, { useState } from 'react';
import { MapPin, AlertCircle, Grid, Filter, AlertTriangle } from 'lucide-react';
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
import type { DashboardSection3RegionalSpread } from '../../../types/dashboard';

interface RegionalSpreadSectionProps {
  section3: DashboardSection3RegionalSpread;
  selectedDesa: string | null;
  onSelectDesa: (desa: string) => void;
  onGoToDataBalita: () => void;
}

export const RegionalSpreadSection: React.FC<RegionalSpreadSectionProps> = ({
  section3,
  selectedDesa,
  onSelectDesa,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const hasData = section3.has_column && section3.all_desas.length > 0;

  const totalBalitaAll = section3.all_desas.reduce((acc, cur) => acc + cur.total_balita, 0) || 1;

  const filteredDesas = section3.all_desas.filter((d) =>
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

  const top10Data = [...section3.top_10_high_stunting_desas].reverse().map((d) => ({
    name: d.desa_name.length > 14 ? `${d.desa_name.substring(0, 12)}...` : d.desa_name,
    fullName: d.desa_name,
    stunting_rate: d.stunting_rate,
    stunting_count: d.stunting_count,
    total_balita: d.total_balita,
    isAboveAvg: d.is_above_avg,
    isSelected: selectedDesa === d.desa_name,
  }));

  const kecamatanItems = section3.kecamatan_spread || [];

  return (
    <div className="space-y-6">
      {/* Header Grup C */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold text-[11px]">
              GRUP C
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Analisis Sebaran Wilayah Administratif
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi 6, 7, dan 8: Treemap beban kasus desa, ranking 10 desa prioritas, dan Small Multiples komparasi kecamatan
          </p>
        </div>
        {selectedDesa && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 text-white flex items-center gap-1 self-start sm:self-auto">
            <Filter className="w-3 h-3 text-teal-400" />
            Filter Desa Aktif: {selectedDesa}
          </span>
        )}
      </div>

      {/* Visualisasi 6: Treemap Jumlah Balita dan Prevalensi Stunting per Desa (Visualisasi Lanjutan #2) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                6
              </span>
              <h4 className="text-sm font-bold text-slate-800">
                Treemap Jumlah Balita dan Prevalensi Stunting per Desa
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">
                Visualisasi Lanjutan (Treemap)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Luas bidang sebanding dengan total populasi balita di desa; gradasi warna merepresentasikan tingkat prevalensi stunting. Klik kotak desa untuk memfilter.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari desa..."
              className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500 w-36"
            />
          </div>
        </div>

        {/* Skala Warna Treemap */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="font-semibold text-slate-700">Legenda Prevalensi Desa:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-400 inline-block" /> &lt; 10% (Sangat Rendah)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-300 inline-block" /> 10–20% (Sedang)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" /> 20–30% (Waspada)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" /> &gt; 30% (Tinggi/Kritis)
          </span>
        </div>

        {hasData ? (
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl min-h-52 max-h-72 overflow-y-auto border border-slate-100">
            {filteredDesas.map((desa) => {
              const isSelected = selectedDesa === desa.desa_name;
              const weightPercent = (desa.total_balita / totalBalitaAll) * 100;
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
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white shrink-0 mt-0.5" />}
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between text-[11px] opacity-90">
                    <span className="font-bold">{desa.stunting_rate.toFixed(1)}%</span>
                    <span className="text-[10px]">N={desa.total_balita}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Data Wilayah Desa Belum Tersedia</p>
          </div>
        )}
      </div>

      {/* Grid 2 Kolom: Visualisasi 7 & Visualisasi 8 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Visualisasi 7: Horizontal Bar Chart Ranking 10 Desa */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                7
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Ranking 10 Desa dengan Prevalensi Tertinggi
                </h4>
                <p className="text-xs text-slate-500">
                  Daftar desa prioritas penanganan intervensi stunting (garis putus-putus = rata-rata desa)
                </p>
              </div>
            </div>

            {hasData && top10Data.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top10Data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" unit="%" domain={[0, 'auto']} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${Number(val).toFixed(1)}% (${item.payload.stunting_count} stunting dari ${item.payload.total_balita} balita)`,
                        `Desa: ${item.payload.fullName}`,
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <ReferenceLine
                      x={section3.avg_desa_stunting_rate}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: 'Rata-rata', fill: '#ef4444', fontSize: 10, position: 'top' }}
                    />
                    <Bar
                      dataKey="stunting_rate"
                      name="Prevalensi Stunting"
                      fill="#ef4444"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                      onClick={(entry: any) => {
                        if (entry && entry.fullName) onSelectDesa(entry.fullName);
                      }}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <MapPin className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Data Ranking Desa Belum Tersedia</p>
              </div>
            )}
          </div>

          {hasData && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex justify-between items-center">
              <span>Desa di Atas Rata-rata: <strong>{section3.desas_above_avg_count}</strong> dari {section3.total_desas_count} desa</span>
              <span className="text-rose-600 font-bold">Rata-rata: {section3.avg_desa_stunting_rate.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Visualisasi 8: Small Multiples Prevalensi Stunting Berdasarkan Kecamatan (Visualisasi Lanjutan #3) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                8
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Small Multiples Prevalensi Stunting per Kecamatan
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold inline-block mt-0.5">
                  Visualisasi Lanjutan (Small Multiples)
                </span>
              </div>
            </div>

            {kecamatanItems.length >= 2 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {kecamatanItems.map((kec) => {
                  const normalCount = kec.total_balita - kec.stunting_count;
                  return (
                    <div
                      key={kec.kecamatan_name}
                      className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2 hover:border-teal-400 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-xs text-slate-800 block line-clamp-1">
                            {kec.kecamatan_name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {kec.desa_count} desa • N={kec.total_balita} balita
                          </span>
                        </div>
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                          kec.stunting_rate >= 20 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {kec.stunting_rate.toFixed(1)}%
                        </span>
                      </div>

                      {/* Mini visual perbandingan komparatif (Small Multiple Bar) */}
                      <div className="space-y-1">
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${kec.stunting_rate}%` }}
                            className="bg-rose-500 h-full"
                            title={`Stunting: ${kec.stunting_count} (${kec.stunting_rate.toFixed(1)}%)`}
                          />
                          <div
                            style={{ width: `${100 - kec.stunting_rate}%` }}
                            className="bg-teal-600 h-full"
                            title={`Normal: ${normalCount} (${(100 - kec.stunting_rate).toFixed(1)}%)`}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span className="text-rose-600 font-semibold">{kec.stunting_count} stunting</span>
                          <span className="text-teal-700 font-semibold">{normalCount} normal</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : kecamatanItems.length === 1 ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                <Grid className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Hanya 1 Kecamatan Terdeteksi ({kecamatanItems[0].kecamatan_name})</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Metode visualisasi Small Multiples memerlukan minimal 2 kelompok kecamatan pembanding independen untuk membandingkan matriks secara paralel.
                </p>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Kolom Kecamatan Belum Tersedia</p>
                <p className="text-[11px] text-slate-500 mt-1">Petakan variabel kecamatan pada menu Data Balita</p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Komparasi multi-panel berskala seragam (Edward Tufte Small Multiples)</span>
            <span className="font-semibold text-slate-700">{kecamatanItems.length} Kecamatan Terpetakan</span>
          </div>
        </div>
      </div>
    </div>
  );
};
