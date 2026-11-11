import React from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
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
import type { DashboardSection2AgeCohort } from '../../../types/dashboard';

interface AgeCohortSectionProps {
  section2: DashboardSection2AgeCohort;
  onGoToDataBalita: () => void;
}

export const AgeCohortSection: React.FC<AgeCohortSectionProps> = ({
  section2,
}) => {
  const hasCohorts = section2.has_column && section2.cohorts.length > 0;

  const chartData = section2.cohorts.map((c) => ({
    cohort: c.cohort_label,
    stunting_rate: c.stunting_rate,
    stunting_count: c.stunting_count,
    total_count: c.total_count,
    mean_zscore: c.mean_zscore_tbu,
  }));

  return (
    <div className="space-y-6">
      {/* Header Grup B */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold text-[11px]">
              GRUP B
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Analisis Kelompok Usia Balita (Kohor 0–59 Bulan)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi 4 dan 5: Prevalensi stunting per kelompok usia dan tren penurunan rata-rata Z-Score TB/U
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Visualisasi 4: Bar Chart Prevalensi Stunting Berdasarkan 6 Kelompok Usia */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                4
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Prevalensi Stunting Berdasarkan Enam Kelompok Usia
                </h4>
                <p className="text-xs text-slate-500">
                  Proporsi kejadian stunting (%) pada masing-masing kohor usia balita
                </p>
              </div>
            </div>

            {hasCohorts ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
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
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Data Usia Balita Belum Tersedia</p>
                <p className="text-[11px] text-slate-500 mt-1">Petakan variabel usia pada menu Data Balita</p>
              </div>
            )}
          </div>

          {hasCohorts && section2.highest_stunting_cohort && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex justify-between items-center">
              <span>Puncak Prevalensi: <strong>{section2.highest_stunting_cohort}</strong></span>
              <span className="font-bold text-rose-600">{section2.highest_stunting_rate?.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Visualisasi 5: Line Chart Rata-rata Z-Score TB/U Berdasarkan Kelompok Usia */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                5
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Line Chart Rata-rata Z-Score TB/U Berdasarkan Kelompok Usia
                </h4>
                <p className="text-xs text-slate-500">
                  Kurva perubahan rata-rata indeks linier tinggi badan anak menurut usia
                </p>
              </div>
            </div>

            {hasCohorts ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
                    <YAxis domain={[-3.5, 0.5]} unit=" SD" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [
                        val !== null ? `${Number(val).toFixed(2)} SD` : 'N/A',
                        'Rata-rata Z-Score TB/U',
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <ReferenceLine y={-2.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Batas Stunting (-2 SD)', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} />
                    <Line
                      type="monotone"
                      dataKey="mean_zscore"
                      name="Rata-rata Z-Score"
                      stroke="#0d9488"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Data Z-Score Belum Terhitung</p>
                <p className="text-[11px] text-slate-500 mt-1">Pastikan kolom Z-Score TB/U terisi pada dataset</p>
              </div>
            )}
          </div>

          {hasCohorts && section2.lowest_mean_zscore_cohort && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex justify-between items-center">
              <span>Z-Score Terendah: <strong>{section2.lowest_mean_zscore_cohort}</strong></span>
              <span className="text-[11px] text-slate-500">Pertumbuhan paling terhambat</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

