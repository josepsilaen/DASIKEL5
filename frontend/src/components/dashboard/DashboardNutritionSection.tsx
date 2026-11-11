import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Activity, AlertCircle, ArrowRight } from 'lucide-react';
import type { DistributionItem } from '../../types/visualization';

interface DashboardNutritionSectionProps {
  hasStatusTbu: boolean;
  statusTbuUnmappedReason?: string | null;
  tbuDistribution: DistributionItem[];
  stuntedCount: number;
  stuntedPercentage: number;

  hasStatusBbu: boolean;
  bbuDistribution: DistributionItem[];

  hasStatusBbtb: boolean;
  bbtbDistribution: DistributionItem[];

  validRecords: number;
  filename?: string | null;
  onGoToDataBalita: () => void;
}

type TabType = 'tbu' | 'bbu' | 'bbtb';

const TBU_COLORS: Record<string, string> = {
  'Sangat Pendek': '#dc2626', // Red
  'Pendek': '#f59e0b',        // Amber
  'Normal': '#10b981',       // Emerald
  'Tinggi': '#3b82f6',       // Blue
};

const BBU_COLORS: Record<string, string> = {
  'Berat Badan Sangat Kurang': '#dc2626',
  'Sangat Kurang': '#dc2626',
  'Berat Badan Kurang': '#f59e0b',
  'Kurang': '#f59e0b',
  'Berat Badan Normal': '#10b981',
  'Normal': '#10b981',
  'Risiko Berat Badan Lebih': '#3b82f6',
  'Risiko Lebih': '#3b82f6',
};

const BBTB_COLORS: Record<string, string> = {
  'Gizi Buruk': '#dc2626',
  'Gizi Kurang': '#f59e0b',
  'Gizi Baik': '#10b981',
  'Berisiko Gizi Lebih': '#06b6d4',
  'Gizi Lebih': '#3b82f6',
  'Obesitas': '#8b5cf6',
};

export const DashboardNutritionSection: React.FC<DashboardNutritionSectionProps> = ({
  hasStatusTbu,
  statusTbuUnmappedReason,
  tbuDistribution,
  stuntedCount,
  stuntedPercentage,
  hasStatusBbu,
  bbuDistribution,
  hasStatusBbtb,
  bbtbDistribution,
  validRecords,
  filename,
  onGoToDataBalita,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('tbu');

  const getActiveData = (): {
    available: boolean;
    data: DistributionItem[];
    colors: Record<string, string>;
    title: string;
    description: string;
    unmappedMessage: string;
  } => {
    if (activeTab === 'tbu') {
      return {
        available: hasStatusTbu,
        data: tbuDistribution,
        colors: TBU_COLORS,
        title: 'Status Gizi Menurut TB/U (Indikator Stunting)',
        description: `Klasifikasi baku WHO untuk perawakan balita (Sangat Pendek, Pendek, Normal, Tinggi)${
          hasStatusTbu && stuntedCount > 0
            ? ` â€” Teridentifikasi ${stuntedCount.toLocaleString('id-ID')} balita stunting (${stuntedPercentage.toFixed(1)}%)`
            : ''
        }`,
        unmappedMessage: statusTbuUnmappedReason || 'Indikator stunting belum tersedia. Kolom status TB/U belum dipetakan.',
      };
    } else if (activeTab === 'bbu') {
      return {
        available: hasStatusBbu,
        data: bbuDistribution,
        colors: BBU_COLORS,
        title: 'Status Gizi Menurut BB/U (Indikator Underweight)',
        description: 'Klasifikasi berat badan menurut usia balita',
        unmappedMessage: 'Indikator BB/U belum tersedia. Kolom status BB/U belum dipetakan pada dataset aktif.',
      };
    } else {
      return {
        available: hasStatusBbtb,
        data: bbtbDistribution,
        colors: BBTB_COLORS,
        title: 'Status Gizi Menurut BB/TB (Indikator Wasting)',
        description: 'Klasifikasi status gizi akut berat badan menurut tinggi badan',
        unmappedMessage: 'Indikator BB/TB belum tersedia. Kolom status BB/TB belum dipetakan pada dataset aktif.',
      };
    }
  };

  const current = getActiveData();
  const validSampleCount = current.data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header Panel & Tab Switcher */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shadow-2xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-slate-800 tracking-tight">
                Ringkasan Distribusi Status Antropometri
              </h3>
              <p className="text-[12.5px] text-slate-500 mt-0.5">
                Pemantauan tiga indikator pertumbuhan balita standar baku antropometri WHO
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('tbu')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
              activeTab === 'tbu'
                ? 'bg-white text-teal-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            TB/U (Stunting)
            {hasStatusTbu && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-teal-50 text-teal-700 border border-teal-200">
                {stuntedPercentage.toFixed(1)}%
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bbu')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
              activeTab === 'bbu'
                ? 'bg-white text-teal-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            BB/U (Underweight)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bbtb')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
              activeTab === 'bbtb'
                ? 'bg-white text-teal-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            BB/TB (Wasting)
          </button>
        </div>
      </div>

      {/* Konten Tab */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
          <div>
            <h4 className="text-[14px] font-bold text-slate-800">{current.title}</h4>
            <p className="text-[12px] text-slate-500">{current.description}</p>
          </div>
          {current.available && (
            <div className="text-[12px] text-slate-500 font-medium">
              Sampel Valid:{' '}
              <strong className="text-slate-800 font-semibold">
                {validSampleCount.toLocaleString('id-ID')}
              </strong>{' '}
              catatan
            </div>
          )}
        </div>

        {current.available ? (
          current.data.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={current.data}
                  layout="vertical"
                  margin={{ top: 4, right: 28, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      padding: '6px 10px',
                    }}
                    formatter={(value: any, _name: any, item: any) => [
                      `${value ?? 0} balita (${item.payload?.percentage ?? 0}%)`,
                      'Jumlah',
                    ]}
                    labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                  />
                  <Bar dataKey="count" name="Jumlah" radius={[0, 4, 4, 0]} barSize={22}>
                    {current.data.map((entry, index) => {
                      const color = current.colors[entry.category] || '#0d9488';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Ringkasan Kategori Bawah */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                {current.data.map((item) => (
                  <div
                    key={item.category}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-0.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: current.colors[item.category] || '#0d9488' }}
                      />
                      <span className="text-[11.5px] font-semibold text-slate-700 truncate" title={item.category}>
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-0.5">
                      <span className="text-[14px] font-bold text-slate-900 tabular-nums">
                        {item.count.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-sm space-y-2">
              <p>Tidak ada baris data valid untuk indikator ini</p>
            </div>
          )
        ) : (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3 my-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h5 className="text-[14px] font-bold text-slate-800">
                Indikator Belum Tersedia
              </h5>
              <p className="text-[12.5px] text-slate-500 max-w-md mx-auto">
                {current.unmappedMessage}
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={onGoToDataBalita}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-200 transition-colors cursor-pointer"
              >
                Petakan Kolom di Data Balita
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 text-[11.5px] text-slate-500">
        * Status gizi antropometri dihitung berdasarkan standar baku WHO ({validRecords.toLocaleString('id-ID')} catatan valid). Tidak direka dari tinggi badan mentah.
        {filename ? ` Berkas aktif: ${filename}.` : ''}
      </div>
    </div>
  );
};
