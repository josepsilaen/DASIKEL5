
import React from 'react';
import { AlertCircle, MapPin } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  DashboardSection3RegionalSpread,
} from '../../../types/dashboard';

interface Props {
  section3: DashboardSection3RegionalSpread;
  selectedDesa: string | null;
  statusFilter?: string | null;
  onSelectDesa: (desa: string) => void;
  onGoToDataBalita: () => void;
}

type AreaItem = {
  name: string;
  jumlah: number;
  kasus: number;
  rate: number;
  tipe: 'desa' | 'kecamatan';
};

function fillForRate(rate: number): string {
  if (rate >= 30) return '#b91c1c';
  if (rate >= 20) return '#d97706';
  if (rate >= 10) return '#0d9488';
  return '#2563eb';
}

export const RegionalSpreadSection: React.FC<Props> = ({
  section3,
  selectedDesa,
  statusFilter,
  onSelectDesa,
}) => {
  const hasDesa = section3.all_desas.length > 0;

  // Jika tidak ada desa, gunakan kecamatan nyata.
  const wilayah: AreaItem[] = hasDesa
    ? section3.all_desas.map((row) => ({
        name: row.desa_name,
        jumlah: row.total_balita,
        kasus: row.stunting_count,
        rate: row.stunting_rate,
        tipe: 'desa',
      }))
    : (section3.kecamatan_spread ?? []).map(
        (row) => ({
          name: row.kecamatan_name,
          jumlah: row.total_balita,
          kasus: row.stunting_count,
          rate: row.stunting_rate,
          tipe: 'kecamatan',
        })
      );

  const valid = wilayah.filter(
    (row) => row.jumlah > 0
  );

  const total = valid.reduce(
    (sum, item) => sum + item.jumlah,
    0
  );

  const wilayahLabel = hasDesa
    ? 'Desa'
    : 'Kecamatan';

  const isNormalFilter = statusFilter === 'Tidak Stunting';
  const rankData = [...valid]
    .sort(
      (a, b) =>
        (isNormalFilter ? b.jumlah - a.jumlah : b.kasus - a.kasus) ||
        b.jumlah - a.jumlah
    )
    .slice(0, 10);

  const smallMultiples =
    section3.kecamatan_spread ?? [];

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-800">
          C. Analisis Perbandingan Wilayah
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Treemap menunjukkan komposisi jumlah catatan,
          bar chart membandingkan jumlah kasus,
          dan small multiples membandingkan persentase.
        </p>
      </div>

      {!hasDesa && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          Dataset aktif tidak memiliki kolom desa.
          Analisis wilayah menggunakan kecamatan yang
          tersedia tanpa membuat data desa buatan.
        </div>
      )}

      {/* VISUALISASI 6 — TREEMAP */}
      <article className="rounded-xl border border-slate-200 bg-white p-5">
        <h4 className="text-sm font-bold text-slate-800">
          6. Treemap Komposisi Catatan menurut {wilayahLabel}
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          Luas kotak proporsional terhadap jumlah catatan.
          Warna menunjukkan kelompok persentase stunting
          dalam dataset, bukan klasifikasi risiko resmi.
        </p>

        {valid.length ? (
          <>
            <div className="mt-4 h-[300px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <Treemap
                  data={valid}
                  dataKey="jumlah"
                  nameKey="name"
                  aspectRatio={4 / 3}
                  stroke="#ffffff"
                  fill="#0d9488"
                  content={(props: any) => {
                    if (
                      props.depth !== 1 ||
                      props.width <= 0 ||
                      props.height <= 0
                    ) {
                      return <g />;
                    }

                    const item = valid.find(
                      (entry) => entry.name === props.name
                    );

                    if (!item) return <g />;

                    const big =
                      props.width >= 85 &&
                      props.height >= 36;

                    return (
                      <g
                        key={item.name}
                        onClick={
                          hasDesa
                            ? () => onSelectDesa(item.name)
                            : undefined
                        }
                        style={
                          hasDesa
                            ? { cursor: 'pointer' }
                            : undefined
                        }
                      >
                        <rect
                          x={props.x}
                          y={props.y}
                          width={props.width}
                          height={props.height}
                          fill={statusFilter ? '#0d9488' : fillForRate(item.rate)}
                          stroke="#fff"
                          strokeWidth={2}
                          rx={2}
                        />

                        {big && (
                          <>
                            <text
                              x={props.x + 7}
                              y={props.y + 16}
                              fontSize={11}
                              fontWeight={600}
                              fill="#fff"
                            >
                              {item.name.length > 18
                                ? `${item.name.slice(0, 16)}…`
                                : item.name}
                            </text>

                            {props.height >= 55 && (
                              <text
                                x={props.x + 7}
                                y={props.y + 32}
                                fontSize={10}
                                fill="#fff"
                              >
                                {item.jumlah} catatan
                              </text>
                            )}
                          </>
                        )}
                      </g>
                    );
                  }}
                >
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value)} catatan`,
                      'Jumlah catatan',
                    ]}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-600">
              <span> <text className="font-bold">Biru:</text> kurang dari 10%</span>
              <span><text className="font-bold">Teal:</text> 10%–kurang dari 20%</span>
              <span><text className="font-bold">Jingga:</text> 20%–kurang dari 30%</span>
              <span><text className="font-bold">Merah:</text> 30% ke atas</span>
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              Total {total.toLocaleString('id-ID')} catatan
              pada {valid.length} {wilayahLabel.toLowerCase()}.
              {hasDesa
                ? ` Desa terpilih: ${selectedDesa ?? 'tidak ada'}.`
                : ''}
            </p>
          </>
        ) : (
          <p className="mt-4 flex items-center gap-2 text-xs text-amber-700">
            <AlertCircle className="h-4 w-4" />
            Data wilayah belum tersedia.
          </p>
        )}
      </article>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* VISUALISASI 7 — BAR CHART */}
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800">
            7. Ranking Jumlah Catatan {isNormalFilter ? 'Tidak Stunting' : 'Stunting'}
            menurut {wilayahLabel}
          </h4>

          <p className="mt-1 text-xs text-slate-500">
            Bar chart membandingkan jumlah kasus absolut,
            bukan persentase. Jumlah kasus dipengaruhi
            jumlah catatan setiap wilayah.
          </p>

          {rankData.length ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rankData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 15,
                    left: 5,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 'auto']}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value, _name, props) => [
                      `${Number(value)} ${isNormalFilter ? 'catatan tidak stunting' : 'kasus stunting'} dari ${props.payload.jumlah} catatan`,
                      'Kasus stunting',
                    ]}
                  />
                  <Bar
                    dataKey={isNormalFilter ? 'jumlah' : 'kasus'}
                    name={isNormalFilter ? 'Jumlah catatan tidak stunting' : 'Jumlah kasus stunting'}
                    fill="#0d9488"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={26}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Data wilayah tidak tersedia.
            </p>
          )}
        </article>

        {/* VISUALISASI 8 — SMALL MULTIPLES */}
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800">
            8. Small Multiples: Proporsi Stunting per Kecamatan
          </h4>

          <p className="mt-1 text-xs text-slate-500">
            Setiap kecamatan menggunakan skala 0–100%
            yang sama agar perbandingan adil.
          </p>

          {statusFilter ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Perbandingan persentase tidak ditampilkan
              ketika status difilter menjadi satu kategori.
              Gunakan grafik jumlah kasus, atau pilih
              Semua Status untuk membandingkan proporsi.
            </p>
          ) : smallMultiples.length ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {smallMultiples.map((row) => {
                const pct = Math.max(
                  0,
                  Math.min(100, row.stunting_rate)
                );

                return (
                  <div
                    key={row.kecamatan_name}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <strong className="text-xs text-slate-800">
                        {row.kecamatan_name}
                      </strong>
                      <span className="text-xs font-semibold text-slate-700">
                        {pct.toFixed(1)}%
                      </span>
                    </div>

                    <div
                      className="flex h-4 w-full overflow-hidden rounded-sm bg-slate-200"
                      role="img"
                      aria-label={`${row.kecamatan_name}: ${pct.toFixed(1)} persen stunting`}
                    >
                      <div
                        className="h-full bg-teal-600"
                        style={{ width: `${pct}%` }}
                      />
                      <div
                        className="h-full bg-slate-300"
                        style={{
                          width: `${100 - pct}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-[11px] text-slate-500">
                      {row.stunting_count} kasus dari{' '}
                      {row.total_balita} catatan
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Data kecamatan belum tersedia.
            </p>
          )}

          <p className="mt-3 text-[11px] text-slate-500">
            Teal = stunting; abu-abu = tidak stunting.
          </p>
        </article>
      </div>
    </section>
  );
};
