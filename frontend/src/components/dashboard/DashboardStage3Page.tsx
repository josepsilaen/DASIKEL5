import { useGlobalFilters } from '../../state/globalFilters';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AlertTriangle,
  Filter,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  API_BASE_URL,
  fetchVisualizationData,
} from '../../services/api';

import type {
  DashboardSummaryResponse,
} from '../../types/dashboard';

import type {
  FilterOptions,
  VisualizationFilterRequest,
} from '../../types/visualization';

// ======================================================
// 1. TIPE DAN NILAI AWAL FILTER
// ======================================================

type DashboardFilters = Required<
  Pick<
    VisualizationFilterRequest,
    | 'kecamatan'
    | 'jenis_kelamin'
    | 'age_group'
    | 'periode'
    | 'status_stunting'
  >
>;

const EMPTY_FILTERS: DashboardFilters = {
  kecamatan: null,
  jenis_kelamin: null,
  age_group: null,
  periode: null,
  status_stunting: null,
};

// ======================================================
// 2. HELPER FORMAT ANGKA
// ======================================================

const formatNumber = (value: number): string =>
  value.toLocaleString('id-ID');

const formatPercent = (value: number): string =>
  `${value.toLocaleString('id-ID', {
    maximumFractionDigits: 1,
  })}%`;

// ======================================================
// 3. KOMPONEN DASHBOARD UTAMA
// ======================================================

export function DashboardStage3Page() {
  const { filters, setFilters } = useGlobalFilters();

  const [options, setOptions] =
    useState<FilterOptions | null>(null);

  const [summary, setSummary] =
    useState<DashboardSummaryResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // ====================================================
  // 4. MENGAMBIL PILIHAN FILTER DARI BACKEND
  // ====================================================

  useEffect(() => {
    let mounted = true;

    fetchVisualizationData({
      region_type: 'kecamatan',
    })
      .then((result) => {
        if (
          mounted &&
          result.has_active_dataset
        ) {
          setOptions(result.filter_options);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Gagal mengambil pilihan filter.'
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // ====================================================
  // 5. MENGAMBIL DATA DASHBOARD SESUAI FILTER
  // ====================================================

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const url = new URL(
          `${API_BASE_URL}/api/dashboard/summary`
        );

        // Hanya filter aktif yang dikirim ke API.
        Object.entries(filters).forEach(
          ([key, value]) => {
            if (value) {
              url.searchParams.set(key, value);
            }
          }
        );

        const response = await fetch(
          url.toString(),
          {
            headers: {
              Accept: 'application/json',
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Gagal memuat dashboard (HTTP ${response.status}).`
          );
        }

        const data =
          (await response.json()) as DashboardSummaryResponse;

        if (!controller.signal.aborted) {
          setSummary(data);
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Gagal menghubungi backend.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [filters, refreshKey]);

  // ====================================================
  // 6. MEMPERBARUI FILTER
  // ====================================================

  const update = useCallback(
    (
      key: keyof DashboardFilters,
      value: string
    ) => {
      setFilters((previous) => ({
        ...previous,
        [key]: value || null,
      }));
    },
    []
  );

  // ====================================================
  // 7. MEMBUAT DAFTAR PERIODE BULAN
  // ====================================================

  const periodOptions = useMemo(() => {
    const values = (
      options?.periode_list ?? []
    )
      .map((entry) =>
        entry.trim().slice(0, 7)
      )
      .filter((entry) =>
        /^\d{4}-\d{2}$/.test(entry)
      );

    return Array.from(
      new Set(values)
    ).sort();
  }, [options]);

  // ====================================================
  // 8. MENENTUKAN UKURAN YANG DIPAKAI GRAFIK
  // ====================================================

  const statusSelected = Boolean(
    filters.status_stunting
  );

  // Semua status:
  //   Bar chart membandingkan proporsi stunting.
  //
  // Status = Stunting:
  //   Bar chart membandingkan jumlah kasus stunting.
  //
  // Status = Tidak Stunting:
  //   Bar chart membandingkan jumlah catatan normal.

  const regionMeasure =
    filters.status_stunting === 'Stunting'
      ? 'kasus'
      : filters.status_stunting === 'Tidak Stunting'
        ? 'total'
        : 'proporsi';

  // Line chart menggunakan persentase hanya
  // ketika filter status tidak diaktifkan.

  const trendMeasure =
    filters.status_stunting === 'Stunting'
      ? 'stunting_count'
      : filters.status_stunting === 'Tidak Stunting'
        ? 'total_measured'
        : 'stunting_rate';

  const regionChartTitle = statusSelected
    ? `Jumlah Catatan ${filters.status_stunting} menurut Kecamatan`
    : 'Proporsi Stunting menurut Kecamatan';

  const trendChartTitle = statusSelected
    ? `Jumlah Catatan ${filters.status_stunting} per Bulan`
    : 'Tren Bulanan Proporsi Stunting dalam Dataset';

  // ====================================================
  // 9. MENGOLAH DATA PERBANDINGAN KECAMATAN
  // ====================================================

  const regionData = useMemo(() => {
    const rows = (
      summary?.region_summary ?? []
    )
      .filter((item) => item.count > 0)
      .map((item) => {
        const total = item.count;
        const kasus = item.stunting_count ?? 0;

        return {
          nama: item.nama,
          kasus,
          total,
          proporsi:
            item.stunting_count != null &&
            total > 0
              ? Number(
                  (
                    (kasus / total) *
                    100
                  ).toFixed(1)
                )
              : 0,
        };
      });

    // Ranking mengikuti ukuran yang dibandingkan.
    return rows.sort((a, b) => {
      if (
        filters.status_stunting ===
        'Stunting'
      ) {
        return b.kasus - a.kasus;
      }

      if (
        filters.status_stunting ===
        'Tidak Stunting'
      ) {
        return b.total - a.total;
      }

      return b.proporsi - a.proporsi;
    });
  }, [
    summary,
    filters.status_stunting,
  ]);

  // ====================================================
  // 10. MENGOLAH DATA DERET WAKTU
  // ====================================================

  const trendData = useMemo(() => {
    const points = (
      summary?.tableau_analytics
        ?.time_series_trend
        ?.points ?? []
    );

    return [...points].sort(
      (a, b) =>
        a.period_label.localeCompare(
          b.period_label
        )
    );
  }, [summary]);

  const activeCount = Object.values(
    filters
  ).filter(Boolean).length;

  // ====================================================
  // 11. MENYIAPKAN EMPAT KPI
  // ====================================================

  const cards = summary
    ? [
        {
          label: 'Total Catatan Terpilih',
          value: formatNumber(
            summary.total_records
          ),
          detail:
            'Jumlah baris setelah seluruh filter diterapkan.',
        },
        {
          label: 'Catatan Berlabel Stunting',
          value: summary.has_status_tbu
            ? formatNumber(
                summary.stunted_count
              )
            : '—',
          detail:
            'Kasus berdasarkan status TB/U valid tanpa konflik.',
        },
        {
          label: 'Proporsi Stunting Dataset',

          value:
            summary.has_status_tbu &&
            !statusSelected
              ? formatPercent(
                  summary.stunted_percentage
                )
              : '—',

          detail: statusSelected
            ? 'Proporsi tidak dibandingkan karena data sudah difilter menurut status.'
            : 'Kasus stunting dibagi catatan berlabel valid.',
        },
        {
          label: 'Cakupan Kecamatan',
          value: formatNumber(
            summary.total_kecamatan
          ),
          detail:
            'Jumlah kecamatan yang memenuhi pilihan filter.',
        },
      ]
    : [];

  // ====================================================
  // 12. MEMPERBAIKI FORMAT TOOLTIP RECHARTS
  // ====================================================

  // Recharts dapat mengirim:
  // number, string, array, null, atau undefined.
  //
  // Parameter menggunakan unknown supaya fungsi
  // kompatibel dengan tipe Formatter milik Recharts.

  const parseTooltipNumber = (
    value: unknown
  ): number | null => {
    const rawValue = Array.isArray(value)
      ? value[0]
      : value;

    if (
      rawValue === null ||
      rawValue === undefined ||
      rawValue === ''
    ) {
      return null;
    }

    const number = Number(rawValue);

    return Number.isFinite(number)
      ? number
      : null;
  };

  // Tooltip untuk bar chart kecamatan.
  const formatRegionTooltip = (
    value: unknown
  ): string => {
    const number = parseTooltipNumber(value);

    if (number === null) {
      return 'Data tidak tersedia';
    }

    return statusSelected
      ? `${formatNumber(number)} catatan`
      : formatPercent(number);
  };

  // Tooltip untuk line chart bulanan.
  const formatTrendTooltip = (
    value: unknown
  ): string => {
    const number = parseTooltipNumber(value);

    if (number === null) {
      return 'Data tidak tersedia';
    }

    return statusSelected
      ? `${formatNumber(number)} catatan`
      : formatPercent(number);
  };

  // ====================================================
  // 13. TAMPILAN DASHBOARD UTAMA
  // ====================================================

  return (
    <section className="space-y-4">

      {/* HEADER DASHBOARD */}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Ringkasan Analitik & Filter Dashboard
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Seluruh KPI dan grafik dihitung dari dataset
            aktif melalui FastAPI.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setRefreshKey(
              (value) => value + 1
            )
          }
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          Segarkan
        </button>
      </div>

      {/* FILTER INTERAKTIF */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Filter className="h-4 w-4 text-teal-600" />
            Filter Interaktif
          </h3>

          <button
            type="button"
            disabled={
              loading ||
              activeCount === 0
            }
            onClick={() =>
              setFilters({
                ...EMPTY_FILTERS,
              })
            }
            className="flex items-center gap-1 text-xs font-semibold text-teal-700 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset ({activeCount})
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">

          {(
            [
              [
                'kecamatan',
                'Kecamatan',
                options?.kecamatan_list ?? [],
              ],
              [
                'jenis_kelamin',
                'Jenis Kelamin',
                options?.jenis_kelamin_list ?? [],
              ],
              [
                'age_group',
                'Kelompok Usia',
                options?.age_group_list ?? [],
              ],
              [
                'periode',
                'Periode (Bulan)',
                periodOptions,
              ],
              [
                'status_stunting',
                'Status Stunting',
                [
                  'Stunting',
                  'Tidak Stunting',
                ],
              ],
            ] as [
              keyof DashboardFilters,
              string,
              string[]
            ][]
          ).map(
            ([key, label, values]) => (
              <label
                key={key}
                className="block text-xs font-medium text-slate-600"
              >
                {label}

                <select
                  value={filters[key] ?? ''}
                  onChange={(event) =>
                    update(
                      key,
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                >
                  <option value="">
                    Semua
                  </option>

                  {values.map((value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            )
          )}
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          {activeCount > 0
            ? `${activeCount} filter diterapkan pada keempat KPI dan kedua grafik.`
            : 'Seluruh data aktif ditampilkan tanpa filter.'}
        </p>
      </div>

      {/* PESAN ERROR */}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
        >
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* DATASET BELUM TERSEDIA */}

      {summary?.has_active_dataset === false && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Belum ada dataset aktif.
          Unggah dan validasi dataset di menu
          Manajemen Data & ETL.
        </p>
      )}

      {/* DATASET AKTIF */}

      {summary?.has_active_dataset && (
        <>

          {/* EMPAT KPI */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                <p className="text-xs font-medium text-slate-500">
                  {card.label}
                </p>

                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {card.value}
                </p>

                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  {card.detail}
                </p>
              </div>
            ))}
          </div>

          {/* JIKA FILTER TIDAK MEMILIKI HASIL */}

          {summary.total_records === 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Tidak ada catatan yang cocok
              dengan kombinasi filter ini.
            </p>
          )}

          {/* GRAFIK DASHBOARD */}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

            {/* GRAFIK 1: BAR CHART KECAMATAN */}

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">

              <h3 className="text-sm font-bold text-slate-900">
                {regionChartTitle}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {statusSelected
                  ? 'Membandingkan jumlah catatan sesuai status yang dipilih pada setiap kecamatan. Klik batang untuk memfilter wilayah.'
                  : 'Membandingkan persentase catatan berlabel stunting pada setiap kecamatan. Klik batang untuk memfilter wilayah.'}
              </p>

              {summary.has_status_tbu &&
              regionData.length > 0 ? (

                <div className="mt-4 h-[290px]">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={regionData}
                      layout="vertical"
                      margin={{
                        left: 7,
                        right: 20,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        domain={
                          statusSelected
                            ? [0, 'auto']
                            : [0, 100]
                        }
                        unit={
                          statusSelected
                            ? ''
                            : '%'
                        }
                        allowDecimals={
                          !statusSelected
                        }
                      />

                      <YAxis
                        type="category"
                        dataKey="nama"
                        width={132}
                        tick={{
                          fontSize: 10,
                        }}
                      />

                      <Tooltip
                        formatter={formatRegionTooltip}
                      />

                      <Bar
                        dataKey={regionMeasure}
                        name={
                          statusSelected
                            ? 'Jumlah catatan'
                            : 'Proporsi stunting (%)'
                        }
                        fill="#0d9488"
                        radius={[0, 5, 5, 0]}
                        onClick={(item) => {
                          const region = (
                            item as {
                              payload?: {
                                nama?: string;
                              };
                            }
                          ).payload?.nama;

                          if (region) {
                            update(
                              'kecamatan',
                              region
                            );
                          }
                        }}
                      />

                    </BarChart>
                  </ResponsiveContainer>
                </div>

              ) : (
                <p className="mt-4 text-xs text-slate-500">
                  Belum ada data wilayah
                  dengan status stunting valid.
                </p>
              )}

              {statusSelected && (
                <p className="mt-3 text-[11px] text-amber-700">
                  Karena status stunting sedang
                  difilter, grafik menggunakan
                  jumlah catatan, bukan persentase.
                </p>
              )}
            </div>

            {/* GRAFIK 2: DERET WAKTU BULANAN */}

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">

              <h3 className="text-sm font-bold text-slate-900">
                {trendChartTitle}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {statusSelected
                  ? 'Jumlah catatan sesuai status terpilih berdasarkan bulan pengukuran.'
                  : 'Perubahan proporsi stunting dalam dataset berdasarkan bulan pengukuran, bukan tren prevalensi populasi resmi.'}
              </p>

              {trendData.length >= 2 ? (

                <div className="mt-4 h-[290px]">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={trendData}
                      margin={{
                        left: 0,
                        right: 18,
                        bottom: 12,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="period_label"
                        tick={{
                          fontSize: 10,
                        }}
                        angle={-30}
                        textAnchor="end"
                        height={52}
                        interval="preserveStartEnd"
                      />

                      <YAxis
                        domain={
                          statusSelected
                            ? [0, 'auto']
                            : [0, 100]
                        }
                        unit={
                          statusSelected
                            ? ''
                            : '%'
                        }
                        allowDecimals={
                          !statusSelected
                        }
                        tick={{
                          fontSize: 11,
                        }}
                      />

                      <Tooltip
                        formatter={formatTrendTooltip}
                      />

                      <Line
                        type="linear"
                        dataKey={trendMeasure}
                        name={trendChartTitle}
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        dot={{
                          r: 4,
                        }}
                        activeDot={{
                          r: 6,
                        }}
                        connectNulls={false}
                      />

                    </LineChart>
                  </ResponsiveContainer>
                </div>

              ) : trendData.length === 1 ? (

                // Satu titik bukan tren.
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">

                  <p className="font-semibold">
                    Hanya tersedia satu periode:
                    {' '}
                    {trendData[0].period_label}
                  </p>

                  <p className="mt-2">
                    Jumlah catatan sesuai filter:
                    {' '}
                    <strong>
                      {formatNumber(
                        trendData[0].total_measured
                      )}
                    </strong>
                  </p>

                  <p className="mt-2">
                    Catatan berlabel stunting:
                    {' '}
                    <strong>
                      {formatNumber(
                        trendData[0].stunting_count
                      )}
                    </strong>
                  </p>

                  {!statusSelected && (
                    <p className="mt-2">
                      Proporsi stunting:
                      {' '}
                      <strong>
                        {formatPercent(
                          trendData[0].stunting_rate
                        )}
                      </strong>
                    </p>
                  )}

                  <p className="mt-3">
                    Grafik tren memerlukan
                    minimal dua periode pengukuran.
                    Oleh karena itu, data
                    ditampilkan sebagai ringkasan angka.
                  </p>
                </div>

              ) : (
                <p className="mt-4 text-xs text-slate-500">
                  Tren belum tersedia.
                  Periksa pemetaan tanggal
                  pengukuran atau pilihan filter.
                </p>
              )}

            </div>
          </div>

          {/* CATATAN INTERPRETASI */}

          <p className="text-xs text-slate-500">
            {formatNumber(summary.total_records)}
            {' '}catatan memenuhi filter.
            {' '}
            {statusSelected
              ? 'Grafik membandingkan jumlah catatan sesuai status yang dipilih.'
              : 'Persentase dihitung dari catatan dengan label TB/U valid tanpa konflik.'}
            {' '}
            Dataset simulasi atau terbatas
            tidak mewakili prevalensi seluruh
            Kabupaten Toba.
            {' '}
            Tahun 2026 hanya mencakup periode
            yang tersedia di dalam berkas.
          </p>

        </>
      )}

      {/* STATUS LOADING */}

      {loading && (
        <p className="text-xs font-medium text-teal-700">
          Memperbarui ringkasan dashboard…
        </p>
      )}

    </section>
  );
}
