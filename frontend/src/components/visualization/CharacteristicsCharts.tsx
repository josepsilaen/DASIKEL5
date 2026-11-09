import React from 'react';
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
import { Calendar, UserCheck, AlertCircle } from 'lucide-react';
import type { DistributionItem } from '../../types/visualization';

interface CharacteristicsChartsProps {
  hasAgeColumn: boolean;
  ageDistribution: DistributionItem[];
  ageUnmappedReason?: string | null;

  hasGenderColumn: boolean;
  genderDistribution: DistributionItem[];
  genderUnmappedReason?: string | null;
}

const AGE_BAR_COLORS = [
  '#0d9488', // 0-5 bln (Teal-600)
  '#0284c7', // 6-11 bln (Sky-600)
  '#3b82f6', // 12-23 bln (Blue-500)
  '#6366f1', // 24-35 bln (Indigo-500)
  '#8b5cf6', // 36-47 bln (Violet-500)
  '#ec4899', // 48-59 bln (Pink-500)
  '#94a3b8', // Di luar cakupan balita >= 60 bln (Slate-400)
];

function getAgeBarColor(category: string, index: number): string {
  if (category.toLowerCase().includes('luar') || category.includes('60')) {
    return '#94a3b8';
  }
  return AGE_BAR_COLORS[index % (AGE_BAR_COLORS.length - 1)];
}

const GENDER_COLORS: Record<string, string> = {
  'laki-laki': '#0284c7', // Sky-600
  'laki': '#0284c7',
  'l': '#0284c7',
  'perempuan': '#ec4899', // Pink-500
  'wanita': '#ec4899',
  'p': '#ec4899',
};

function getGenderColor(label: string, index: number): string {
  const clean = label.toLowerCase();
  for (const k of Object.keys(GENDER_COLORS)) {
    if (clean.includes(k)) {
      return GENDER_COLORS[k];
    }
  }
  return index === 0 ? '#0284c7' : '#ec4899';
}

export const CharacteristicsCharts: React.FC<CharacteristicsChartsProps> = ({
  hasAgeColumn,
  ageDistribution,
  ageUnmappedReason,
  hasGenderColumn,
  genderDistribution,
  genderUnmappedReason,
}) => {
  const totalAgeCount = ageDistribution.reduce((acc, curr) => acc + curr.count, 0);
  const totalGenderCount = genderDistribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[18px] sm:text-[20px] font-bold text-slate-900 tracking-tight">
          Karakteristik Demografi Balita
        </h3>
        <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">
          Distribusi kohor usia antropometri dan proporsi jenis kelamin subjek balita pada wilayah terpilih.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
        {/* 1. Distribusi Kelompok Usia Balita */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100/80 flex items-center justify-center text-teal-600 shadow-2xs">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-slate-800">
                  Distribusi Usia Balita (Kelompok Usia)
                </h4>
                <p className="text-[12.5px] text-slate-500 mt-0.5">
                  Frekuensi balita berdasarkan kohor usia (bulan) saat pengukuran antropometri
                </p>
              </div>
            </div>
          </div>

          {!hasAgeColumn ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-300 min-h-[280px] space-y-2">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-2xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h5 className="text-[14.5px] font-bold text-slate-800">Variabel Usia Tidak Tersedia</h5>
              <p className="text-[12.5px] text-slate-500 max-w-sm leading-relaxed">
                {ageUnmappedReason || 'Kolom usia belum dipetakan dalam dataset balita.'}
              </p>
            </div>
          ) : ageDistribution.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-300 min-h-[280px]">
              <p className="text-[13px] text-slate-500">Tidak ada data usia pada filter ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[280px] lg:h-[300px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ageDistribution}
                    margin={{ top: 16, right: 16, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }}
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
                        'Jumlah Anak',
                      ]}
                      labelStyle={{ fontWeight: 700, color: '#0f172a' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={42}>
                      {ageDistribution.map((entry, index) => (
                        <Cell
                          key={`age-cell-${entry.category}-${index}`}
                          fill={getAgeBarColor(entry.category, index)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Grid Ringkasan Kelompok Usia */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100">
                {ageDistribution.map((item, idx) => (
                  <div
                    key={item.category}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getAgeBarColor(item.category, idx) }}
                      />
                      <span className="text-[12px] font-semibold text-slate-600 truncate max-w-[120px]">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-[15px] font-bold text-slate-800 font-mono">
                      {item.count.toLocaleString('id-ID')}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Catatan Khusus Cakupan Balita 0-59 Bulan */}
              {ageDistribution.some((item) => item.category.toLowerCase().includes('luar')) && (
                <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-[12px] leading-relaxed flex items-start gap-2 shadow-2xs">
                  <span className="font-bold text-amber-950 shrink-0">Batasan Cakupan Penelitian:</span>
                  <span>
                    Kohor utama analisis epidemiologis stunting mencakup balita usia 0–59 bulan. Data anak usia ≥ 60 bulan ditandai secara terpisah sebagai <em>Di luar cakupan (≥ 60 bln)</em> dan persentase kohor balita dihitung berdasarkan total balita 0–59 bulan agar tidak mendistorsi analisis gizi.
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500">
            <span>Standar kelompok usia antropometri WHO</span>
            {hasAgeColumn && ageDistribution.length > 0 && (
              <span className="font-mono text-slate-600 font-semibold">
                N = {totalAgeCount.toLocaleString('id-ID')} balita
              </span>
            )}
          </div>
        </div>

        {/* 2. Komposisi Jenis Kelamin */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100/80 flex items-center justify-center text-sky-600 shadow-2xs">
                <UserCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-slate-800">
                  Proporsi Jenis Kelamin Balita
                </h4>
                <p className="text-[12.5px] text-slate-500 mt-0.5">
                  Perbandingan balita Laki-laki (L) dan Perempuan (P) dalam dataset
                </p>
              </div>
            </div>
          </div>

          {!hasGenderColumn ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-300 min-h-[280px] space-y-2">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-2xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h5 className="text-[14.5px] font-bold text-slate-800">Variabel Gender Tidak Tersedia</h5>
              <p className="text-[12.5px] text-slate-500 max-w-sm leading-relaxed">
                {genderUnmappedReason || 'Kolom jenis kelamin belum dipetakan dalam dataset.'}
              </p>
            </div>
          ) : genderDistribution.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-300 min-h-[280px]">
              <p className="text-[13px] text-slate-500">Tidak ada data jenis kelamin pada filter ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[280px] lg:h-[300px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Pie
                      data={genderDistribution}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={125}
                      paddingAngle={4}
                    >
                      {genderDistribution.map((entry, index) => (
                        <Cell
                          key={`gender-cell-${entry.category}-${index}`}
                          fill={getGenderColor(entry.category, index)}
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
                </ResponsiveContainer>
              </div>

              {/* Breakdown Cards Gender */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                {genderDistribution.map((item, idx) => {
                  const color = getGenderColor(item.category, idx);
                  return (
                    <div
                      key={item.category}
                      className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-md shadow-2xs"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <span className="text-[13px] font-bold text-slate-800 block">
                            {item.category}
                          </span>
                          <span className="text-[12px] text-slate-400 font-medium">
                            {item.percentage}% dari total
                          </span>
                        </div>
                      </div>
                      <span className="text-[20px] font-extrabold text-slate-900 font-mono">
                        {item.count.toLocaleString('id-ID')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500">
            <span>Variabel jenis kelamin standar WHO</span>
            {hasGenderColumn && genderDistribution.length > 0 && (
              <span className="font-mono text-slate-600 font-semibold">
                N = {totalGenderCount.toLocaleString('id-ID')} balita
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
