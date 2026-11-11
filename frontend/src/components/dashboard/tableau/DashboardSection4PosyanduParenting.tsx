import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { HeartPulse, AlertCircle, FileSpreadsheet } from 'lucide-react';
import type { DashboardSection4PosyanduParenting as Section4Data } from '../../../types/dashboard';
import { DashboardCorrelationHeatmap } from './DashboardCorrelationHeatmap';

interface DashboardSection4PosyanduParentingProps {
  data: Section4Data;
  onGoToDataBalita: () => void;
}

export const DashboardSection4PosyanduParenting: React.FC<DashboardSection4PosyanduParentingProps> = ({
  data,
  onGoToDataBalita,
}) => {
  const hasEitherVariable = data.has_naik_bb || data.has_kelas_ibu || data.correlation_cells.length > 0;

  if (!hasEitherVariable) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-800">
              Bagian 4: Pengaruh Kehadiran Posyandu dan Pola Asuh Ibu terhadap Stunting
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Variabel pemantauan KMS (Status Naik BB N/T/O/B) dan Kelas Ibu Balita belum dipetakan pada dataset aktif.
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

  const naikBbData = data.naik_bb_categories.map((c) => ({
    name: c.category,
    stunting_rate: c.stunting_rate,
    total: c.total_count,
    stunting_count: c.stunting_count,
  }));

  const kelasIbuData = data.kelas_ibu_categories.map((c) => ({
    name: c.category,
    stunting_rate: c.stunting_rate,
    total: c.total_count,
    stunting_count: c.stunting_count,
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bagian 4: Pengaruh Kehadiran Posyandu dan Pola Asuh Ibu terhadap Stunting
            </h3>
            <p className="text-xs text-slate-500">
              Kenaikan berat badan KMS bulanan, partisipasi Kelas Ibu Balita, dan matriks korelasi numerik
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 w-fit">
          Pemantauan Rutin Posyandu
        </span>
      </div>

      {/* 2 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Balita Naik Berat Badan (Status N)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900">
              {data.naik_bb_overall_rate !== null && data.naik_bb_overall_rate !== undefined
                ? `${data.naik_bb_overall_rate.toFixed(1)}%`
                : 'Belum Ada Data'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {data.has_naik_bb
              ? 'Indikator pertumbuhan linier positif bulanan KMS'
              : data.naik_bb_unmapped_reason || 'Memerlukan kolom status naik BB'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <span className="text-xs text-emerald-800 font-medium">Partisipasi Kelas Ibu Balita</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-900">
              {data.kelas_ibu_participation_rate !== null && data.kelas_ibu_participation_rate !== undefined
                ? `${data.kelas_ibu_participation_rate.toFixed(1)}%`
                : 'Belum Ada Data'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">
            {data.has_kelas_ibu
              ? 'Persentase ibu balita yang mengikuti pembinaan pola asuh'
              : data.kelas_ibu_unmapped_reason || 'Memerlukan kolom kelas ibu balita'}
          </p>
        </div>
      </div>

      {/* 2 Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart Naik BB KMS */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Prevalensi Stunting vs Status Kenaikan BB (KMS)
              </h4>
              <p className="text-[11px] text-slate-400">
                Kategori KMS: N (Naik), T (Tidak Naik), O (Tidak Hadir Bulan Lalu), B (Baru)
              </p>
            </div>
          </div>
          {data.has_naik_bb && naikBbData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={naikBbData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 text-center">
              <span>{data.naik_bb_unmapped_reason || 'Data status naik BB belum tersedia.'}</span>
              <button
                onClick={onGoToDataBalita}
                className="mt-2 text-teal-600 hover:underline cursor-pointer"
              >
                Petakan kolom di Data Balita
              </button>
            </div>
          )}
        </div>

        {/* Bar Chart Kelas Ibu Balita */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Prevalensi Stunting vs Kelas Ibu Balita
              </h4>
              <p className="text-[11px] text-slate-400">
                Perbandingan anak stunting antara ibu yang ikut vs tidak ikut kelas
              </p>
            </div>
          </div>
          {data.has_kelas_ibu && kelasIbuData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kelasIbuData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 text-center">
              <span>{data.kelas_ibu_unmapped_reason || 'Data Kelas Ibu Balita belum tersedia.'}</span>
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

      {/* Matriks Korelasi 4x4 */}
      <DashboardCorrelationHeatmap
        variables={data.correlation_variables}
        cells={data.correlation_cells}
      />
    </div>
  );
};
