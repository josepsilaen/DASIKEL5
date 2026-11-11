import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Users, AlertCircle, ArrowRight } from 'lucide-react';
import type { DistributionItem } from '../../types/visualization';

interface DashboardCharacteristicsSectionProps {
  hasAge: boolean;
  ageDistribution: DistributionItem[];
  inScopeBalitaCount: number;
  outOfScopeAgeCount: number;

  hasGender: boolean;
  genderDistribution: DistributionItem[];

  onGoToDataBalita: () => void;
}

const GENDER_COLORS: Record<string, string> = {
  'Laki-laki (L)': '#0284c7', // Sky-600
  'Perempuan (P)': '#ec4899', // Pink-500
  'Laki-laki': '#0284c7',
  'Perempuan': '#ec4899',
  'L': '#0284c7',
  'P': '#ec4899',
};

export const DashboardCharacteristicsSection: React.FC<DashboardCharacteristicsSectionProps> = ({
  hasAge,
  ageDistribution,
  inScopeBalitaCount,
  outOfScopeAgeCount,
  hasGender,
  genderDistribution,
  onGoToDataBalita,
}) => {
  // Pisahkan kelompok balita 0â€“59 bulan dari kelompok di luar cakupan (â‰¥ 60 bln)
  const inScopeAges = ageDistribution.filter(
    (item) => !item.category.includes('â‰¥ 60') && !item.category.includes('luar')
  );
  const outOfScopeItem = ageDistribution.find(
    (item) => item.category.includes('â‰¥ 60') || item.category.includes('luar')
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
      {/* Panel Kiri: Distribusi Kelompok Usia Balita (0â€“59 bulan) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">
                  Kohor Kelompok Usia Balita (0â€“59 bln)
                </h3>
                <p className="text-[12px] text-slate-500">
                  Hanya menggunakan usia saat ukur balita (bukan usia orang tua)
                </p>
              </div>
            </div>
            {hasAge && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                {inScopeBalitaCount.toLocaleString('id-ID')} balita (0â€“59 bln)
              </span>
            )}
          </div>

          {hasAge ? (
            inScopeAges.length > 0 ? (
              <div className="space-y-3 pt-1">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={inScopeAges}
                    margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        padding: '6px 10px',
                      }}
                      formatter={(val: any, _name: any, item: any) => [
                        `${val} balita (${item.payload?.percentage ?? 0}% dari balita 0â€“59 bln)`,
                        'Jumlah',
                      ]}
                    />
                    <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>

                {outOfScopeAgeCount > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/90 text-[11.5px] text-amber-900 flex items-center justify-between">
                    <span className="font-medium">
                      âš ï¸ Data di luar cakupan penelitian (â‰¥ 60 bln):
                    </span>
                    <span className="font-bold">
                      {outOfScopeAgeCount.toLocaleString('id-ID')} catatan ({outOfScopeItem?.percentage ?? 0}%)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Data kelompok usia tidak mencukupi
              </div>
            )
          ) : (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2.5 my-2">
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h5 className="text-[13.5px] font-bold text-slate-800">
                Kolom Usia Belum Dipetakan
              </h5>
              <p className="text-[12px] text-slate-500 max-w-sm mx-auto">
                Petakan kolom usia saat ukur balita untuk melihat sebaran kohor usia 0â€“59 bulan.
              </p>
              <button
                type="button"
                onClick={onGoToDataBalita}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-200 transition-colors cursor-pointer"
              >
                Petakan Kolom Usia
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <p className="text-[11.5px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
          * Denominator persentase kelompok usia dihitung khusus dari balita 0â€“59 bulan.
        </p>
      </div>

      {/* Panel Kanan: Komposisi Jenis Kelamin */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">
                  Komposisi Jenis Kelamin
                </h3>
                <p className="text-[12px] text-slate-500">
                  Proporsi balita laki-laki dan perempuan pada dataset aktif
                </p>
              </div>
            </div>
            {hasGender && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                {genderDistribution.reduce((a, b) => a + b.count, 0).toLocaleString('id-ID')} balita
              </span>
            )}
          </div>

          {hasGender ? (
            genderDistribution.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-1">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={genderDistribution}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {genderDistribution.map((entry, index) => {
                        const color = GENDER_COLORS[entry.category] || (index === 0 ? '#0284c7' : '#ec4899');
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${val} balita (${item.payload?.percentage ?? 0}%)`,
                        item.payload?.category ?? 'Jumlah',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2.5 w-full sm:w-auto">
                  {genderDistribution.map((item, idx) => {
                    const color = GENDER_COLORS[item.category] || (idx === 0 ? '#0284c7' : '#ec4899');
                    return (
                      <div
                        key={item.category}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 min-w-[170px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-[12px] font-semibold text-slate-700">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-[15px] font-bold text-slate-900 tabular-nums">
                            {item.count.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[11.5px] font-semibold text-slate-500">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Data jenis kelamin tidak tersedia
              </div>
            )
          ) : (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2.5 my-2">
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h5 className="text-[13.5px] font-bold text-slate-800">
                Kolom Jenis Kelamin Belum Dipetakan
              </h5>
              <p className="text-[12px] text-slate-500 max-w-sm mx-auto">
                Petakan kolom jenis kelamin balita pada dataset aktif untuk melihat komposisi demografi.
              </p>
              <button
                type="button"
                onClick={onGoToDataBalita}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-sky-700 bg-white hover:bg-sky-50 border border-sky-200 transition-colors cursor-pointer"
              >
                Petakan Kolom Gender
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <p className="text-[11.5px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
          * Komposisi gender dihitung dari seluruh catatan yang memuat atribut jenis kelamin valid.
        </p>
      </div>
    </div>
  );
};
