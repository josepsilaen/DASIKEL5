import React from 'react';
import { Scale, AlertCircle, FileSpreadsheet } from 'lucide-react';
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
import type { DashboardSection1BirthWeight, DashboardSection2AgeCohort } from '../../../types/dashboard';
import { DashboardBoxPlotVisual } from '../../dashboard/tableau/DashboardBoxPlotVisual';

interface BirthFactorsSectionProps {
  section1: DashboardSection1BirthWeight;
  section2: DashboardSection2AgeCohort;
  onGoToDataBalita?: () => void;
}

export const BirthFactorsSection: React.FC<BirthFactorsSectionProps> = ({
  section1,
  section2,
}) => {
  const hasBirthWeight = section1.has_column && section1.total_valid > 0;
  const hasAgeCohort = section2.has_column && section2.cohorts.length > 0;

  // Siapkan data untuk Visualisasi 1: Box plot Z-score TB/U per kelompok usia
  const boxPlotAgeItems = section2.cohorts.map((c, idx) => {
    const palette = ['#0284c7', '#0d9488', '#16a34a', '#ca8a04', '#ea580c', '#e11d48'];
    return {
      label: c.cohort_label,
      color: palette[idx % palette.length],
      stats: c.boxplot || {
        min_value: -3,
        q1: -2,
        median: -1.5,
        q3: -0.8,
        max_value: 1,
        mean: c.mean_zscore_tbu || -1.5,
        count: c.total_count,
      },
    };
  });

  // Siapkan data untuk Visualisasi 2: Bar chart prevalensi stunting kategori BBLR
  const bblrBarData = section1.categories.map((c) => ({
    name: c.category,
    stunting_rate: c.stunting_rate,
    stunting_count: c.stunting_count,
    total_count: c.total_count,
    normal_count: c.normal_count,
  }));

  // Siapkan data untuk Visualisasi 3: Scatter plot berat lahir vs Z-score TB/U
  const scatterStunting = section1.scatter_sample.filter((p) => p.is_stunting);
  const scatterNormal = section1.scatter_sample.filter((p) => !p.is_stunting);

  return (
    <div className="space-y-6">
      {/* Header Grup A */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold text-[11px]">
              GRUP A
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Analisis Faktor Kelahiran & Pertumbuhan Awal
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi 1, 2, dan 3: Distribusi Z-Score per kohor, prevalensi berdasarkan kategori BBLR, dan korelasi berat lahir
          </p>
        </div>
      </div>

      {/* Visualisasi 1: Box Plot Z-Score TB/U per Kelompok Usia (Visualisasi Lanjutan #1) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="text-sm font-bold text-slate-800">
                Box Plot Distribusi Nilai Z-Score TB/U Berdasarkan Kelompok Usia
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">
                Visualisasi Lanjutan (Box Plot)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi statistik lima serangkai (Min, Q1, Median, Q3, Max) nilai Z-Score TB/U pada 6 kelompok usia balita
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Standar WHO Anthro</span>
        </div>

        {hasAgeCohort ? (
          <div>
            <DashboardBoxPlotVisual
              title="Sebaran Z-Score TB/U per Kohor Usia"
              unit="SD"
              items={boxPlotAgeItems}
              thresholdLine={{ value: -2.0, label: 'Batas Stunting (-2 SD)', color: '#ef4444' }}
            />
            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-start gap-2 border border-slate-200/60">
              <span className="font-bold text-slate-700">Interpretasi Analitis:</span>
              <span>
                Garis putus-putus merah pada nilai -2.0 SD merupakan batas ambang baku WHO untuk diagnosis stunting.
                Kuartil median di bawah garis ini mengindikasikan bahwa lebih dari separuh populasi balita pada kelompok usia tersebut mengalami perlambatan tinggi badan.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Data Usia atau Z-Score TB/U Belum Tersedia</p>
            <p className="text-[11px] text-slate-500 mt-1">Petakan kolom Usia dan Z-Score TB/U pada menu Data Balita</p>
          </div>
        )}
      </div>

      {/* Grid 2 Kolom: Visualisasi 2 & Visualisasi 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Visualisasi 2: Bar Chart Prevalensi Stunting Kategori BBLR */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Prevalensi Stunting Berdasarkan Kategori BBLR
                </h4>
                <p className="text-xs text-slate-500">
                  Perbandingan proporsi balita stunting pada kelompok BBLR (&lt; 2,5 kg) vs Normal (&ge; 2,5 kg)
                </p>
              </div>
            </div>

            {hasBirthWeight ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bblrBarData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${Number(val).toFixed(1)}% (${item.payload.stunting_count} stunting dari ${item.payload.total_count} balita)`,
                        'Prevalensi Stunting',
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar
                      dataKey="stunting_rate"
                      name="Prevalensi Stunting (%)"
                      fill="#ef4444"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Scale className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Kolom Berat Lahir Belum Dipetakan</p>
                <p className="text-[11px] text-slate-500 mt-1">Petakan variabel berat lahir pada menu Data Balita</p>
              </div>
            )}
          </div>

          {hasBirthWeight && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>BBLR Stunting: <strong>{section1.bblr_stunting_rate.toFixed(1)}%</strong> ({section1.bblr_stunting_count}/{section1.bblr_count})</span>
              <span>Normal Stunting: <strong>{section1.normal_stunting_rate.toFixed(1)}%</strong></span>
            </div>
          )}
        </div>

        {/* Visualisasi 3: Scatter Plot Berat Lahir vs Z-Score TB/U */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                3
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Scatter Plot Berat Lahir vs Z-Score TB/U
                </h4>
                <p className="text-xs text-slate-500">
                  Satu titik mewakili satu balita; merah = Stunting, biru = Tidak Stunting
                </p>
              </div>
            </div>

            {hasBirthWeight && section1.scatter_sample.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Berat Lahir"
                      unit=" kg"
                      domain={[1.0, 5.0]}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Z-Score TB/U"
                      unit=" SD"
                      domain={[-5.0, 3.0]}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(val: any, name: any) => [
                        `${Number(val).toFixed(2)} ${name === 'Berat Lahir' ? 'kg' : 'SD'}`,
                        name,
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <ReferenceLine y={-2.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Stunting (-2 SD)', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} />
                    <ReferenceLine x={2.5} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'BBLR (2.5 kg)', fill: '#f59e0b', fontSize: 10, position: 'insideBottomRight' }} />
                    <Scatter name="Stunting" data={scatterStunting} fill="#ef4444" opacity={0.7} />
                    <Scatter name="Tidak Stunting" data={scatterNormal} fill="#2563eb" opacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileSpreadsheet className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Data Sampel Scatter Belum Tersedia</p>
                <p className="text-[11px] text-slate-500 mt-1">Diperlukan variabel berat lahir dan Z-Score TB/U valid</p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Stunting (Z &lt; -2 SD)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Tidak Stunting (Normal)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
