
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
  Legend,
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
import {
  EMPTY_GLOBAL_FILTERS,
  useGlobalFilters,
} from '../../state/globalFilters';
import type { GlobalFilters } from '../../state/globalFilters';
import type { FilterOptions } from '../../types/visualization';

// =====================================================
// 1. TIPE RESPONS BACKEND
// =====================================================

type RegionItem = {
  kategori: string;
  jumlah: number;
  berlabel: number;
  stunting: number;
  proporsi_stunting: number | null;
};

type MonthlyItem = {
  periode: string;
  total: number;
  berlabel: number;
  stunting: number;
  proporsi_stunting: number | null;
};

type Overview = {
  total_setelah_filter: number;
  perbandingan_wilayah: RegionItem[];
  visualisasi: {
    tren_bulanan_dataset: MonthlyItem[];
  };
  kpi: {
    stunting: {
      pembilang: number;
      penyebut: number;
      persentase: number | null;
    };
  };
};

type RegionChartItem = {
  kecamatan: string;
  jumlah: number;
  berlabel: number;
  stunting: number;
  tidak_stunting: number;
  nilai: number | null;
};

type MonthChartItem = {
  periode: string;
  jumlah: number;
  berlabel: number;
  stunting: number;
  nilai: number | null;
};

// =====================================================
// 2. FORMAT ANGKA
// =====================================================

const fmt = (n: number) => n.toLocaleString('id-ID');

const pct = (n: number) =>
  `${n.toLocaleString('id-ID', {
    maximumFractionDigits: 1,
  })}%`;

const metric = (value: unknown, count: boolean) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);

  if (!Number.isFinite(n)) {
    return 'Tidak tersedia';
  }

  return count ? `${fmt(n)} catatan` : pct(n);
};

// =====================================================
// 3. AMBIL ANALISIS BERDASARKAN GLOBAL FILTER
// =====================================================

function useOverview() {
  const { filters } = useGlobalFilters();

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setData(null);

    const url = new URL(
      `${API_BASE_URL}/api/analytics/overview`
    );

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    async function load() {
      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!response.ok) {
          let detail = `HTTP ${response.status}`;

          try {
            const body: { detail?: string } =
              await response.json();

            if (body.detail) {
              detail = body.detail;
            }
          } catch {
            // Respons error tidak selalu JSON.
          }

          throw new Error(detail);
        }

        const result =
          (await response.json()) as Overview;

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Gagal mengambil data analisis.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [filters, version]);

  return { filters, data, loading, error, refresh };
}

// =====================================================
// 4. FILTER GLOBAL BERSAMA
// =====================================================

function Stage5Filters() {
  const { filters, setFilters } = useGlobalFilters();

  const [options, setOptions] =
    useState<FilterOptions | null>(null);

  useEffect(() => {
    let active = true;

    fetchVisualizationData({
      region_type: 'kecamatan',
    })
      .then((data) => {
        if (active && data.has_active_dataset) {
          setOptions(data.filter_options);
        }
      })
      .catch(() => {
        // Pilihan filter tersedia setelah dataset aktif.
      });

    return () => {
      active = false;
    };
  }, []);

  const months = useMemo(() => {
    return Array.from(
      new Set(
        (options?.periode_list ?? [])
          .map((item) => item.trim().slice(0, 7))
          .filter((item) =>
            /^\d{4}-\d{2}$/.test(item)
          )
      )
    ).sort();
  }, [options]);

  const specs: {
    key: keyof GlobalFilters;
    label: string;
    values: string[];
  }[] = [
    {
      key: 'kecamatan',
      label: 'Kecamatan',
      values: options?.kecamatan_list ?? [],
    },
    {
      key: 'jenis_kelamin',
      label: 'Jenis Kelamin',
      values: options?.jenis_kelamin_list ?? [],
    },
    {
      key: 'age_group',
      label: 'Kelompok Usia',
      values: options?.age_group_list ?? [],
    },
    {
      key: 'periode',
      label: 'Periode Pengukuran',
      values: months,
    },
    {
      key: 'status_stunting',
      label: 'Status Stunting',
      values: ['Stunting', 'Tidak Stunting'],
    },
  ];

  const count = Object.values(filters).filter(Boolean).length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Filter className="h-4 w-4 text-teal-600" />
          Filter Global
        </h3>

        <button
          type="button"
          disabled={count === 0}
          onClick={() =>
            setFilters({ ...EMPTY_GLOBAL_FILTERS })
          }
          className="flex items-center gap-1 text-xs text-teal-700 disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset ({count})
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {specs.map(({ key, label, values }) => (
          <label
            key={key}
            className="text-xs font-medium text-slate-600"
          >
            {label}

            <select
              value={filters[key] ?? ''}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  [key]: event.target.value || null,
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-800"
            >
              <option value="">Semua</option>

              {values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Filter ini digunakan bersama dengan Dashboard,
        Visualisasi Interaktif, dan Analisis Faktor Risiko.
      </p>
    </section>
  );
}

// =====================================================
// 5. KOMPONEN TAMPILAN BERSAMA
// =====================================================

function Header({
  title,
  description,
  onRefresh,
  loading,
}: {
  title: string;
  description: string;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 disabled:opacity-50"
      >
        <RefreshCw
          className={`h-4 w-4 ${
            loading ? 'animate-spin' : ''
          }`}
        />
        Segarkan
      </button>
    </div>
  );
}

function ErrorMessage({
  message,
}: {
  message: string | null;
}) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
    >
      <AlertTriangle className="h-4 w-4" />
      {message}
    </p>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        {detail}
      </p>
    </div>
  );
}

// =====================================================
// HALAMAN 1: PERBANDINGAN WILAYAH
// =====================================================

export function RegionComparisonPage() {
  const {
    filters,
    data,
    loading,
    error,
    refresh,
  } = useOverview();

  const { setFilters } = useGlobalFilters();

  const isCount = Boolean(filters.status_stunting);

  const regions = useMemo<RegionChartItem[]>(() => {
    return (data?.perbandingan_wilayah ?? [])
      .filter((row) => row.jumlah > 0)
      .map((row) => ({
        kecamatan: row.kategori,
        jumlah: row.jumlah,
        berlabel: row.berlabel,
        stunting: row.stunting,
        tidak_stunting:
          row.berlabel - row.stunting,
        nilai: isCount
          ? row.jumlah
          : row.proporsi_stunting,
      }))
      .sort(
        (a, b) =>
          (b.nilai ?? -1) - (a.nilai ?? -1)
      );
  }, [data, isCount]);

  const validRegions = regions.filter(
    (row) => row.nilai !== null
  );

  const highest = validRegions[0];
  const lowest = validRegions.at(-1);

  const gap =
    !isCount && highest && lowest
      ? (highest.nilai ?? 0) -
        (lowest.nilai ?? 0)
      : null;

  return (
    <section className="space-y-5">
      <Header
        title="Perbandingan Wilayah"
        description="Perbandingan lima kecamatan berdasarkan catatan terfilter, jumlah kasus, dan proporsi berlabel valid."
        onRefresh={refresh}
        loading={loading}
      />

      <Stage5Filters />
      <ErrorMessage message={error} />

      {loading && (
        <p className="text-xs text-teal-700">
          Memuat perbandingan wilayah…
        </p>
      )}

      {data && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Catatan Terpilih"
              value={fmt(data.total_setelah_filter)}
              detail="Total setelah filter global"
            />

            <Stat
              label="Kasus Stunting"
              value={fmt(
                data.kpi.stunting.pembilang
              )}
              detail="Kasus dengan label valid pada pilihan saat ini"
            />

            <Stat
              label="Kecamatan Terwakili"
              value={fmt(regions.length)}
              detail="Kecamatan dengan catatan terpilih"
            />

            <Stat
              label={
                isCount
                  ? 'Proporsi Disembunyikan'
                  : 'Selisih Antarkecamatan'
              }
              value={
                gap === null
                  ? '—'
                  : `${gap.toLocaleString('id-ID', {
                      maximumFractionDigits: 1,
                    })} poin`
              }
              detail={
                isCount
                  ? 'Pilih Semua Status untuk membandingkan proporsi'
                  : 'Selisih poin persentase tertinggi dan terendah; bukan signifikansi statistik'
              }
            />
          </div>

          {regions.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-4 text-xs text-amber-800">
              Tidak ada kecamatan yang cocok dengan filter.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {/* GRAFIK PERBANDINGAN */}
                <article className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    {isCount
                      ? `Jumlah Catatan ${filters.status_stunting} per Kecamatan`
                      : 'Proporsi Stunting per Kecamatan'}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Bar chart membandingkan{' '}
                    {isCount
                      ? 'jumlah catatan sesuai status'
                      : 'proporsi berdasarkan label yang valid'}
                    . Klik batang untuk memfilter kecamatan.
                  </p>

                  <div className="mt-4 h-[290px]">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={validRegions}
                        layout="vertical"
                        margin={{
                          left: 6,
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
                            isCount
                              ? [0, 'auto']
                              : [0, 100]
                          }
                          unit={isCount ? '' : '%'}
                          allowDecimals={!isCount}
                        />

                        <YAxis
                          type="category"
                          dataKey="kecamatan"
                          width={134}
                          tick={{ fontSize: 10 }}
                        />

                        <Tooltip
                          formatter={(value: unknown) =>
                            metric(value, isCount)
                          }
                        />

                        <Bar
                          dataKey="nilai"
                          fill="#0d9488"
                          radius={[0, 4, 4, 0]}
                          onClick={(item) => {
                            const name = (
                              item as {
                                payload?: {
                                  kecamatan?: string;
                                };
                              }
                            ).payload?.kecamatan;

                            if (name) {
                              setFilters((old) => ({
                                ...old,
                                kecamatan: name,
                              }));
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                {/* GRAFIK KOMPOSISI */}
                <article className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Komposisi Catatan Berlabel per Kecamatan
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Jumlah kasus stunting dan tidak stunting
                    dengan satuan catatan, bukan persentase.
                  </p>

                  {isCount ? (
                    <p className="mt-6 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      Komposisi dua status hanya ditampilkan
                      ketika Status Stunting = Semua.
                      Saat satu status dipilih, gunakan
                      grafik jumlah catatan di sebelah kiri.
                    </p>
                  ) : (
                    <div className="mt-4 h-[290px]">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart
                          data={regions}
                          layout="vertical"
                          margin={{
                            left: 6,
                            right: 20,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />

                          <XAxis
                            type="number"
                            allowDecimals={false}
                          />

                          <YAxis
                            type="category"
                            dataKey="kecamatan"
                            width={134}
                            tick={{ fontSize: 10 }}
                          />

                          <Tooltip
                            formatter={(value: unknown) =>
                              metric(value, true)
                            }
                          />

                          <Legend />

                          <Bar
                            dataKey="stunting"
                            name="Stunting"
                            stackId="status"
                            fill="#0d9488"
                          />

                          <Bar
                            dataKey="tidak_stunting"
                            name="Tidak Stunting"
                            stackId="status"
                            fill="#94a3b8"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </article>
              </div>

              {/* TABEL VERIFIKASI */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Tabel Perbandingan Kecamatan
                </h3>

                <table className="w-full min-w-[630px] text-left text-xs">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="p-2">Kecamatan</th>
                      <th className="p-2 text-right">
                        Catatan
                      </th>
                      <th className="p-2 text-right">
                        Label Valid
                      </th>
                      <th className="p-2 text-right">
                        Stunting
                      </th>
                      <th className="p-2 text-right">
                        Proporsi
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {regions.map((row) => (
                      <tr
                        key={row.kecamatan}
                        className="border-b last:border-0"
                      >
                        <td className="p-2 font-semibold">
                          {row.kecamatan}
                        </td>

                        <td className="p-2 text-right">
                          {fmt(row.jumlah)}
                        </td>

                        <td className="p-2 text-right">
                          {fmt(row.berlabel)}
                        </td>

                        <td className="p-2 text-right">
                          {fmt(row.stunting)}
                        </td>

                        <td className="p-2 text-right">
                          {isCount || row.nilai === null
                            ? '—'
                            : pct(row.nilai)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="mt-3 text-[11px] text-slate-500">
                  Proporsi = kasus stunting dibagi jumlah
                  catatan berlabel valid pada masing-masing
                  kecamatan. Data ini bukan prevalensi
                  resmi populasi Kabupaten Toba.
                </p>
              </div>
            </>
          )}

          {regions.some(
            (row) => row.berlabel < 30
          ) && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Terdapat kecamatan dengan kurang dari 30
              catatan berlabel valid. Persentase pada
              kelompok berukuran kecil perlu
              ditafsirkan secara hati-hati.
            </p>
          )}
        </>
      )}
    </section>
  );
}

// =====================================================
// HALAMAN 2: TREN STUNTING 2025–2026
// =====================================================

const labelMonth = (month: number) =>
  [
    'Jan', 'Feb', 'Mar', 'Apr',
    'Mei', 'Jun', 'Jul', 'Agu',
    'Sep', 'Okt', 'Nov', 'Des',
  ][month - 1] ?? String(month);

export function StuntingTrendPage() {
  const {
    filters,
    data,
    loading,
    error,
    refresh,
  } = useOverview();

  const isCount = Boolean(filters.status_stunting);

  const months = useMemo<MonthlyItem[]>(() => {
    return [
      ...(data?.visualisasi.tren_bulanan_dataset ??
        []),
    ].sort((a, b) =>
      a.periode.localeCompare(b.periode)
    );
  }, [data]);

  const series = useMemo<MonthChartItem[]>(() => {
    return months.map((row) => ({
      periode: row.periode,
      jumlah: row.total,
      berlabel: row.berlabel,
      stunting: row.stunting,
      nilai: isCount
        ? row.total
        : row.proporsi_stunting,
    }));
  }, [months, isCount]);

  // Kelompokkan data berdasarkan tahun.
  const y2025 = new Map(
    months
      .filter((m) =>
        m.periode.startsWith('2025-')
      )
      .map((m) => [
        Number(m.periode.slice(5)),
        m,
      ])
  );

  const y2026 = new Map(
    months
      .filter((m) =>
        m.periode.startsWith('2026-')
      )
      .map((m) => [
        Number(m.periode.slice(5)),
        m,
      ])
  );

  // Hanya bandingkan bulan yang tersedia
  // pada KEDUA tahun.
  const common = Array.from(
    { length: 12 },
    (_, i) => i + 1
  ).filter(
    (month) =>
      y2025.has(month) && y2026.has(month)
  );

  const paired = common.map((month) => {
    const a = y2025.get(month)!;
    const b = y2026.get(month)!;

    return {
      bulan: labelMonth(month),
      '2025': isCount
        ? a.total
        : a.proporsi_stunting,
      '2026': isCount
        ? b.total
        : b.proporsi_stunting,
    };
  });

  const combine = (
    year: Map<number, MonthlyItem>
  ) => {
    return common.reduce(
      (acc, month) => {
        const row = year.get(month)!;

        return {
          total: acc.total + row.total,
          berlabel: acc.berlabel + row.berlabel,
          stunting: acc.stunting + row.stunting,
        };
      },
      {
        total: 0,
        berlabel: 0,
        stunting: 0,
      }
    );
  };

  const a = combine(y2025);
  const b = combine(y2026);

  const rateA = a.berlabel
    ? (100 * a.stunting) / a.berlabel
    : null;

  const rateB = b.berlabel
    ? (100 * b.stunting) / b.berlabel
    : null;

  const difference =
    rateA !== null && rateB !== null
      ? rateB - rateA
      : null;

  return (
    <section className="space-y-5">
      <Header
        title="Tren Stunting 2025–2026"
        description="Perubahan bulanan dan perbandingan 2025–2026 pada bulan kalender yang sama."
        onRefresh={refresh}
        loading={loading}
      />

      <Stage5Filters />
      <ErrorMessage message={error} />

      {loading && (
        <p className="text-xs text-teal-700">
          Memuat tren pengukuran…
        </p>
      )}

      {data && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Catatan Terpilih"
              value={fmt(data.total_setelah_filter)}
              detail="Mengikuti filter global"
            />

            <Stat
              label="Bulan Terdata"
              value={fmt(months.length)}
              detail="Jumlah bulan dengan pengukuran"
            />

            <Stat
              label="2025 (Bulan Sebanding)"
              value={
                common.length === 0
                  ? '—'
                  : isCount
                    ? fmt(a.total)
                    : rateA === null
                      ? '—'
                      : pct(rateA)
              }
              detail={
                common.length
                  ? `${fmt(a.berlabel)} label valid, ${fmt(a.stunting)} stunting`
                  : 'Belum tersedia periode pasangan'
              }
            />

            <Stat
              label="2026 (Bulan Sebanding)"
              value={
                common.length === 0
                  ? '—'
                  : isCount
                    ? fmt(b.total)
                    : rateB === null
                      ? '—'
                      : pct(rateB)
              }
              detail={
                common.length
                  ? `${fmt(b.berlabel)} label valid, ${fmt(b.stunting)} stunting`
                  : 'Belum tersedia periode pasangan'
              }
            />
          </div>

          {difference !== null && !isCount && (
            <p className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
              Selisih proporsi 2026 terhadap 2025
              untuk {common.length} bulan yang sama:{' '}
              <strong>
                {difference > 0 ? '+' : ''}
                {difference.toLocaleString('id-ID', {
                  maximumFractionDigits: 1,
                })}{' '}
                poin persentase
              </strong>
              . Ini merupakan perbedaan dalam dataset,
              bukan estimasi perubahan prevalensi
              populasi atau bukti keberhasilan/kegagalan
              intervensi.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* LINE CHART */}
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">
                {isCount
                  ? `Jumlah Catatan ${filters.status_stunting} per Bulan`
                  : 'Perubahan Proporsi Stunting per Bulan'}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Line chart digunakan untuk perubahan
                waktu dengan minimal dua periode.
              </p>

              {series.length >= 2 ? (
                <div className="mt-4 h-[290px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={series}
                      margin={{
                        left: 2,
                        right: 18,
                        bottom: 12,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="periode"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        height={57}
                        interval="preserveStartEnd"
                      />

                      <YAxis
                        type="number"
                        domain={
                          isCount
                            ? [0, 'auto']
                            : [0, 100]
                        }
                        unit={isCount ? '' : '%'}
                        allowDecimals={!isCount}
                      />

                      <Tooltip
                        formatter={(value: unknown) =>
                          metric(value, isCount)
                        }
                      />

                      <Line
                        type="linear"
                        dataKey="nilai"
                        name={
                          isCount
                            ? 'Jumlah catatan'
                            : 'Proporsi stunting (%)'
                        }
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : series.length === 1 ? (
                <p className="mt-5 rounded-lg bg-amber-50 p-4 text-xs text-amber-800">
                  Hanya bulan {series[0].periode} yang
                  tersedia: {fmt(series[0].jumlah)}
                  {' '}catatan dan{' '}
                  {fmt(series[0].stunting)} stunting.
                  Satu periode tidak membentuk tren.
                </p>
              ) : (
                <p className="mt-5 text-xs text-slate-500">
                  Tidak ada tanggal pengukuran valid
                  pada filter yang dipilih.
                </p>
              )}
            </article>

            {/* GROUPED BAR CHART */}
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">
                2025 vs 2026 — Bulan yang Sama
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Grouped bar chart membandingkan{' '}
                {isCount
                  ? 'jumlah catatan'
                  : 'proporsi stunting'}
                {' '}pada bulan kalender yang tersedia
                pada kedua tahun.
              </p>

              {paired.length ? (
                <div className="mt-4 h-[290px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={paired}
                      margin={{
                        left: 2,
                        right: 12,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="bulan"
                        tick={{ fontSize: 10 }}
                      />

                      <YAxis
                        type="number"
                        domain={
                          isCount
                            ? [0, 'auto']
                            : [0, 100]
                        }
                        unit={isCount ? '' : '%'}
                        allowDecimals={!isCount}
                      />

                      <Tooltip
                        formatter={(value: unknown) =>
                          metric(value, isCount)
                        }
                      />

                      <Legend />

                      <Bar
                        dataKey="2025"
                        name="2025"
                        fill="#94a3b8"
                      />

                      <Bar
                        dataKey="2026"
                        name="2026"
                        fill="#0d9488"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-5 rounded-lg bg-amber-50 p-4 text-xs text-amber-800">
                  Tidak ada bulan yang sama pada 2025
                  dan 2026 setelah filter diterapkan.
                  Perbandingan dua tahun tidak
                  ditampilkan agar tidak menyesatkan.
                </p>
              )}
            </article>
          </div>

          {/* TABEL BULANAN */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">
              Rincian Periode Bulanan
            </h3>

            <table className="w-full min-w-[500px] text-xs">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="p-2 text-left">
                    Periode
                  </th>
                  <th className="p-2 text-right">
                    Catatan
                  </th>
                  <th className="p-2 text-right">
                    Label Valid
                  </th>
                  <th className="p-2 text-right">
                    Stunting
                  </th>
                  <th className="p-2 text-right">
                    Proporsi
                  </th>
                </tr>
              </thead>

              <tbody>
                {months.map((m) => (
                  <tr
                    key={m.periode}
                    className="border-b last:border-0"
                  >
                    <td className="p-2">
                      {m.periode}
                    </td>

                    <td className="p-2 text-right">
                      {fmt(m.total)}
                    </td>

                    <td className="p-2 text-right">
                      {fmt(m.berlabel)}
                    </td>

                    <td className="p-2 text-right">
                      {fmt(m.stunting)}
                    </td>

                    <td className="p-2 text-right">
                      {isCount ||
                      m.proporsi_stunting === null
                        ? '—'
                        : pct(m.proporsi_stunting)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            Perbandingan tahunan menggunakan hanya bulan
            yang tersedia pada kedua tahun. Tahun 2026
            belum mencakup satu tahun penuh.
            Seluruh persentase merupakan proporsi dalam
            dataset, bukan prevalensi populasi Kabupaten
            Toba. Jumlah catatan antarbulan juga dapat
            dipengaruhi perbedaan cakupan sampel.
          </p>
        </>
      )}
    </section>
  );
}
