import React from 'react';
import { Network, AlertCircle, Calendar } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DashboardSection4PosyanduParenting, DashboardTimeSeriesTrend } from '../../../types/dashboard';
import { DashboardCorrelationHeatmap } from '../../dashboard/tableau/DashboardCorrelationHeatmap';

interface RelationshipTrendSectionProps {
  section4: DashboardSection4PosyanduParenting;
  timeSeries?: DashboardTimeSeriesTrend;
  onGoToDataBalita?: () => void;
}

export const RelationshipTrendSection: React.FC<RelationshipTrendSectionProps> = ({
  section4,
  timeSeries,
}) => {
  const hasCorrelation = section4.correlation_cells && section4.correlation_cells.length > 0;
  const timePoints = timeSeries?.points || [];
  const hasMultiplePeriods = timePoints.length >= 2;

  // Custom Dot dengan Anotasi Callout pada Deret Waktu
  const renderAnnotatedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || !payload.annotation) {
      return <circle cx={cx} cy={cy} r={4} fill="#0d9488" stroke="#ffffff" strokeWidth={2} />;
    }

    const isPeak = payload.annotation.toLowerCase().includes('puncak');
    const badgeColor = isPeak ? '#ef4444' : '#0d9488';

    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill={badgeColor} stroke="#ffffff" strokeWidth={2.5} />
        {/* Callout Tag Anotasi */}
        <foreignObject x={cx - 75} y={cy - 34} width={150} height={30}>
          <div
            style={{
              backgroundColor: badgeColor,
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '4px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            {payload.annotation}
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Grup D */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold text-[11px]">
              GRUP D
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Analisis Hubungan & Tren Waktu Pengukuran
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi 9 dan 10: Matriks Heatmap korelasi Pearson dan Deret Waktu beranotasi prevalensi stunting
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Visualisasi 9: Heatmap Korelasi Variabel Numerik (Visualisasi Lanjutan #4) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                9
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Heatmap Korelasi Pearson Variabel Numerik (4x4)
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold inline-block mt-0.5">
                  Visualisasi Lanjutan (Heatmap)
                </span>
              </div>
            </div>

            {hasCorrelation ? (
              <div>
                <DashboardCorrelationHeatmap
                  variables={section4.correlation_variables}
                  cells={section4.correlation_cells}
                />
                <p className="text-[11px] text-slate-500 mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                  <strong>Metodologi:</strong> Menghitung koefisien korelasi linier Pearson (r) berpasangan antarvariabel numerik:
                  Berat Lahir, Panjang Lahir, Usia, dan Z-Score TB/U. Warna merah menunjukkan korelasi positif, biru korelasi negatif.
                </p>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Network className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Data Korelasi Belum Cukup</p>
                <p className="text-[11px] text-slate-500 mt-1">Diperlukan minimal dua kolom numerik yang terisi valid</p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Matriks Korelasi Simetris</span>
            <span className="font-semibold text-slate-700">r &isin; [-1.0, +1.0]</span>
          </div>
        </div>

        {/* Visualisasi 10: Deret Waktu Beranotasi Prevalensi Stunting (Visualisasi Lanjutan #5) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                10
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Deret Waktu Beranotasi Prevalensi Stunting
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold inline-block mt-0.5">
                  Visualisasi Lanjutan (Deret Waktu Beranotasi)
                </span>
              </div>
            </div>

            {hasMultiplePeriods ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timePoints} margin={{ top: 25, right: 30, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="timeSeriesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period_label" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" domain={[0, 'auto']} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${Number(val).toFixed(1)}% (${item.payload.stunting_count} stunting dari ${item.payload.total_measured} diukur)`,
                        'Prevalensi Stunting',
                      ]}
                      labelFormatter={(lbl) => `Periode: ${lbl}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Ambang WHO (20%)', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} />
                    <Area
                      type="monotone"
                      dataKey="stunting_rate"
                      name="Prevalensi Stunting"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#timeSeriesGradient)"
                      dot={renderAnnotatedDot}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : timePoints.length === 1 ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                <Calendar className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Hanya 1 Periode Pengukuran Terdeteksi ({timePoints[0].period_label})</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Analisis deret waktu memerlukan beberapa periode pengukuran (minimal 2 titik waktu berbeda) untuk mengevaluasi fluktuasi dan tren prevalensi stunting.
                </p>
                <div className="mt-3 p-2.5 bg-white rounded-lg border border-slate-200/80 inline-block text-xs text-slate-700">
                  Prevalensi pada periode ini: <strong>{timePoints[0].stunting_rate.toFixed(1)}%</strong> ({timePoints[0].stunting_count}/{timePoints[0].total_measured} balita)
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Kolom Tanggal Ukur Belum Dipetakan</p>
                <p className="text-[11px] text-slate-500 mt-1">Petakan variabel tanggal pengukuran pada menu Data Balita</p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Anotasi titik ekstrem (puncak, titik minimum, volume sampel)</span>
            <span className="font-semibold text-slate-700">{timePoints.length} Titik Waktu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
