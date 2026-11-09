import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MapPin, AlertCircle, Building2, Layers } from 'lucide-react';
import type { RegionDistributionItem } from '../../types/visualization';

interface RegionalDistributionChartProps {
  availableRegionTypes: string[];
  selectedRegionType: string;
  onRegionTypeChange: (type: 'kecamatan' | 'puskesmas' | 'desa_kelurahan') => void;
  regionDistribution: RegionDistributionItem[];
  regionUnmappedReason?: string | null;
  hasStatusTbu: boolean;
  isLoading: boolean;
}

export const RegionalDistributionChart: React.FC<RegionalDistributionChartProps> = ({
  availableRegionTypes,
  selectedRegionType,
  onRegionTypeChange,
  regionDistribution,
  regionUnmappedReason,
  hasStatusTbu,
  isLoading,
}) => {
  const hasMultipleRegions = availableRegionTypes.length > 1;
  const totalBalita = regionDistribution.reduce((acc, curr) => acc + curr.count, 0);

  // Dynamic height calculation so unit names have plenty of vertical room
  const computedHeight = Math.max(380, Math.min(regionDistribution.length * 44 + 90, 720));

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all space-y-4">
      {/* Header and Region Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
            <MapPin className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-800 tracking-tight">
              Distribusi Balita per Wilayah Administratif
            </h3>
            <p className="text-[12.5px] text-slate-500 mt-0.5 leading-snug">
              Perbandingan jumlah balita dan proporsi indikasi stunting (TB/U) per unit wilayah di Kabupaten Toba
            </p>
          </div>
        </div>

        {/* Region Switcher Pills */}
        {hasMultipleRegions && (
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start sm:self-auto shadow-2xs">
            {availableRegionTypes.includes('puskesmas') && (
              <button
                type="button"
                onClick={() => onRegionTypeChange('puskesmas')}
                disabled={isLoading}
                className={`px-3 py-1.5 text-[12px] rounded-md transition-colors font-semibold flex items-center gap-1.5 ${
                  selectedRegionType === 'puskesmas'
                    ? 'bg-white shadow-xs text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Puskesmas
              </button>
            )}

            {availableRegionTypes.includes('kecamatan') && (
              <button
                type="button"
                onClick={() => onRegionTypeChange('kecamatan')}
                disabled={isLoading}
                className={`px-3 py-1.5 text-[12px] rounded-md transition-colors font-semibold flex items-center gap-1.5 ${
                  selectedRegionType === 'kecamatan'
                    ? 'bg-white shadow-xs text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Kecamatan
              </button>
            )}

            {availableRegionTypes.includes('desa_kelurahan') && (
              <button
                type="button"
                onClick={() => onRegionTypeChange('desa_kelurahan')}
                disabled={isLoading}
                className={`px-3 py-1.5 text-[12px] rounded-md transition-colors font-semibold flex items-center gap-1.5 ${
                  selectedRegionType === 'desa_kelurahan'
                    ? 'bg-white shadow-xs text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Desa / Kelurahan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Area */}
      {availableRegionTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 min-h-[340px] space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-2xs">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h4 className="text-[15px] font-bold text-slate-800">Kolom Wilayah Tidak Ditemukan</h4>
          <p className="text-[13px] text-slate-500 max-w-sm leading-relaxed">
            {regionUnmappedReason || 'Dataset tidak memuat kolom wilayah (Kecamatan, Puskesmas, atau Desa).'}
          </p>
        </div>
      ) : regionDistribution.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 min-h-[340px]">
          <p className="text-[14px] text-slate-500">Tidak ada data wilayah untuk kombinasi filter ini.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div style={{ height: `${computedHeight}px` }} className="w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={regionDistribution}
                margin={{ top: 12, right: 30, left: 24, bottom: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  type="category"
                  dataKey="region_name"
                  tick={{ fontSize: 13, fill: '#334155', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  width={160}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 13,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    padding: '10px 14px',
                  }}
                  formatter={(val, name) => [
                    `${val ?? 0} balita`,
                    name === 'stunting_count'
                      ? 'Indikasi Stunting (TB/U)'
                      : name === 'normal_count'
                      ? 'Status Normal (TB/U)'
                      : 'Total Balita',
                  ]}
                  labelStyle={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 16, fontSize: 13 }}
                  formatter={(value) => {
                    if (value === 'stunting_count') return 'Indikasi Stunting (Pendek / Sangat Pendek)';
                    if (value === 'normal_count') return 'Gizi Baik / Normal';
                    return 'Total Balita';
                  }}
                />

                {hasStatusTbu ? (
                  <>
                    <Bar
                      dataKey="stunting_count"
                      stackId="a"
                      fill="#f43f5e"
                      name="stunting_count"
                      radius={[0, 0, 0, 0]}
                      barSize={24}
                    />
                    <Bar
                      dataKey="normal_count"
                      stackId="a"
                      fill="#10b981"
                      name="normal_count"
                      radius={[0, 6, 6, 0]}
                      barSize={24}
                    />
                  </>
                ) : (
                  <Bar
                    dataKey="count"
                    fill="#6366f1"
                    name="count"
                    radius={[0, 6, 6, 0]}
                    barSize={24}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] text-slate-500">
            <div>
              <span>Unit Administratif Aktif: </span>
              <strong className="text-slate-800 capitalize">
                {selectedRegionType.replace('_', ' ')}
              </strong>
              <span> ({regionDistribution.length} unit wilayah tercatat)</span>
            </div>
            <div className="font-mono text-slate-700 font-semibold">
              Total Sampel Terpetakan: {totalBalita.toLocaleString('id-ID')} balita
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
