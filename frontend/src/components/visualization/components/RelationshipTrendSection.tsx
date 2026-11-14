
import React from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type {
  DashboardSection4PosyanduParenting,
  DashboardTimeSeriesTrend,
} from '../../../types/dashboard';

import {
  DashboardCorrelationHeatmap,
} from '../../dashboard/tableau/DashboardCorrelationHeatmap';

interface Props {
  section4: DashboardSection4PosyanduParenting;
  timeSeries?: DashboardTimeSeriesTrend;
  statusFilter?: string | null;
  onGoToDataBalita?: () => void;
}

export const RelationshipTrendSection: React.FC<Props> = ({
  section4,
  timeSeries,
  statusFilter,
}) => {
  const cells = section4.correlation_cells ?? [];

  const hasCorrelation = cells.some(
    (cell) =>
      cell.correlation !== null &&
      cell.correlation !== undefined
  );

  const points = [
    ...(timeSeries?.points ?? []),
  ].sort((a, b) =>
    a.period_label.localeCompare(b.period_label)
  );

  // Jika status stunting dipilih, tampilkan
  // jumlah kasus, bukan persentase 100% terus-menerus.
  const isRate = !statusFilter;

  const lineKey =
    statusFilter === 'Stunting'
      ? 'stunting_count'
      : statusFilter === 'Tidak Stunting'
        ? 'total_measured'
        : 'stunting_rate';

  const lineLabel =
    statusFilter === 'Stunting'
      ? 'Jumlah Catatan Stunting'
      : statusFilter === 'Tidak Stunting'
        ? 'Jumlah Catatan Tidak Stunting'
        : 'Proporsi Stunting dalam Dataset (%)';

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-800">
          D. Hubungan Numerik dan Perubahan menurut Waktu
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Heatmap digunakan untuk korelasi numerik,
          sedangkan line chart menunjukkan perubahan
          menurut bulan pengukuran.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* VISUALISASI 9 */}
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800">
            9. Heatmap Korelasi Pearson
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Mengukur kekuatan dan arah hubungan linear
            antarvariabel numerik. Korelasi tidak
            membuktikan hubungan sebab-akibat.
          </p>

          {hasCorrelation ? (
            <div className="mt-3">
              <DashboardCorrelationHeatmap
                variables={section4.correlation_variables}
                cells={cells}
              />

              <p className="mt-2 text-[11px] text-slate-500">
                Korelasi menggunakan pasangan nilai valid.
                Pasangan dengan data tidak mencukupi
                atau varians nol tidak boleh dianggap
                memiliki korelasi.
              </p>
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-xs text-amber-700">
              <AlertCircle className="h-4 w-4" />
              Korelasi belum tersedia untuk pasangan
              data valid.
            </p>
          )}
        </article>

        {/* VISUALISASI 10 */}
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800">
            10. Deret Waktu Bulanan: {lineLabel}
          </h4>

          <p className="mt-1 text-xs text-slate-500">
            Data diurutkan berdasarkan bulan.
            Grafik menunjukkan perubahan pada catatan
            yang tersedia, bukan prevalensi seluruh
            penduduk ataupun pertumbuhan individu.
          </p>

          {points.length >= 2 ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={points}
                  margin={{
                    top: 8,
                    left: 0,
                    right: 16,
                    bottom: 12,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="period_label"
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    height={54}
                    interval="preserveStartEnd"
                  />

                  <YAxis
                    type="number"
                    domain={
                      isRate
                        ? [0, 100]
                        : [0, 'auto']
                    }
                    unit={isRate ? '%' : ''}
                    allowDecimals={isRate}
                    tick={{ fontSize: 10 }}
                  />

                  <Tooltip
                    labelFormatter={(label) =>
                      `Bulan: ${String(label)}`
                    }
                    formatter={(value, _name, item) => [
                      `${Number(value).toLocaleString(
                        'id-ID',
                        {
                          maximumFractionDigits: 1,
                        }
                      )}${isRate ? '%' : ' catatan'} (${item.payload.stunting_count} kasus stunting dari ${item.payload.total_measured} catatan berlabel)`,
                      lineLabel,
                    ]}
                  />

                  <Line
                    type="linear"
                    dataKey={lineKey}
                    name={lineLabel}
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : points.length === 1 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <Calendar className="mb-2 h-4 w-4" />
              Hanya satu periode:
              {' '}{points[0].period_label}.
              Data belum cukup untuk membuat grafik tren.

              <p className="mt-2 font-semibold">
                {points[0].total_measured} catatan
                berlabel, {points[0].stunting_count}
                {' '}stunting (
                {points[0].stunting_rate.toFixed(1)}%).
              </p>
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-xs text-amber-700">
              <AlertCircle className="h-4 w-4" />
              Data tanggal pengukuran belum tersedia.
            </p>
          )}

          <p className="mt-3 text-[11px] text-slate-500">
            Garis ambang prevalensi populasi WHO
            tidak digunakan karena dataset ini tidak
            mewakili seluruh Kabupaten Toba.
            Periode dengan jumlah catatan sedikit
            harus ditafsirkan secara hati-hati.
          </p>
        </article>
      </div>
    </section>
  );
};
