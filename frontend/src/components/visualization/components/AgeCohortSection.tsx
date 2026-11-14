
import React from 'react';
import { AlertCircle } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  DashboardSection2AgeCohort,
} from '../../../types/dashboard';

interface Props {
  statusFilter?: string | null;
  section2: DashboardSection2AgeCohort;
  onGoToDataBalita: () => void;
}

export const AgeCohortSection: React.FC<Props> = ({
  section2,
  statusFilter,
}) => {
  const rows = section2.cohorts
    .filter((row) => row.total_count > 0)
    .map((row) => ({
      kelompok: row.cohort_label,
      total: row.total_count,
      kasus: row.stunting_count,
      persen: row.stunting_rate,
      rerata: row.mean_zscore_tbu ?? null,
    }));

  const validZ = rows.filter(
    (row) => row.rerata !== null
  );

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-800">
          B. Perbandingan Kelompok Usia
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Kelompok usia adalah kategori berurutan,
          bukan titik pengukuran waktu pada anak
          yang sama. Kedua grafik membandingkan kelompok.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* VISUALISASI 4 */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800">
            4. {statusFilter ? 'Jumlah Catatan' : 'Proporsi Stunting'} menurut Kelompok Usia
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Perbandingan persentase kasus pada setiap
            kelompok usia 0–59 bulan.
          </p>

          {rows.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  margin={{
                    top: 8,
                    right: 12,
                    left: 0,
                    bottom: 8,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="kelompok"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    domain={statusFilter ? [0, 'auto'] : [0, 100]}
                    unit="%"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => [
                      `${Number(value).toFixed(1)}% (${item.payload.kasus} dari ${item.payload.total} catatan)`,
                      'Proporsi stunting',
                    ]}
                  />
                  <Bar
                    dataKey={statusFilter ? 'total' : 'persen'}
                    name="Proporsi stunting (%)"
                    fill="#0d9488"
                    maxBarSize={46}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 flex gap-2 text-xs text-amber-700">
              <AlertCircle className="h-4 w-4" />
              Tidak ada kelompok usia valid.
            </p>
          )}
        </article>

        {/* VISUALISASI 5 */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800">
            5. Perbandingan Rata-rata Z-Score TB/U
            menurut Kelompok Usia
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Membandingkan rerata Z-score antar
            kelompok usia, bukan pertumbuhan individu
            yang diikuti secara longitudinal.
          </p>

          {validZ.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={validZ}
                  margin={{
                    top: 8,
                    right: 12,
                    left: 0,
                    bottom: 8,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="kelompok"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    domain={[-5, 3]}
                    unit=" SD"
                    tick={{ fontSize: 11 }}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="#64748b"
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toFixed(2)} SD`,
                      'Rerata Z-score TB/U',
                    ]}
                  />
                  <Bar
                    dataKey="rerata"
                    name="Rerata Z-score TB/U"
                    fill="#2563eb"
                    maxBarSize={46}
                    radius={4}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 flex gap-2 text-xs text-amber-700">
              <AlertCircle className="h-4 w-4" />
              Z-score TB/U valid belum tersedia.
            </p>
          )}

          <p className="mt-3 text-[11px] text-slate-500">
            Rerata kelompok tidak digunakan untuk
            diagnosis individu. Stunting ditentukan
            dari Z-score TB/U setiap anak di bawah -2 SD.
          </p>
        </article>
      </div>
    </section>
  );
};
