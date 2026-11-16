
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  BarChart3,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

import {
  Bar,
  BarChart,
  CartesianGrid,
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
  useGlobalFilters,
} from '../../state/globalFilters';

import type {
  GlobalFilters,
} from '../../state/globalFilters';

import type {
  FilterOptions,
} from '../../types/visualization';

// ======================================================
// 1. TIPE DATA HASIL ANALISIS BACKEND
// ======================================================

type FactorKey =
  | 'bblr'
  | 'asi_eksklusif'
  | 'kunjungan_posyandu_3bln'
  | 'status_gizi_ibu';

type FactorGroup = {
  kategori: string;
  total: number;
  berlabel: number;
  stunting: number;
  tidak_stunting: number;
  konflik: number;
  proporsi_stunting: number | null;
};

type AnalysisResponse = {
  total_tanpa_filter: number;
  total_setelah_filter: number;

  faktor_risiko: Partial<
    Record<FactorKey, FactorGroup[]>
  >;

  kpi: {
    stunting: {
      pembilang: number;
      penyebut: number;
      persentase: number | null;
    };
  };
};

type ChartRow = FactorGroup & {
  label: string;
  nilai: number;
};

type FactorDefinition = {
  key: FactorKey;
  title: string;
  purpose: string;
  note: string;
  order: string[];
};

// ======================================================
// 2. DEFINISI EMPAT FAKTOR RISIKO
// ======================================================

const FACTORS: FactorDefinition[] = [
  {
    key: 'bblr',
    title: 'BBLR dan Status Stunting',
    purpose:
      'Membandingkan kelompok BBLR dan bukan BBLR berdasarkan berat lahir.',
    note:
      'BBLR berarti berat lahir kurang dari 2,5 kg. Perbandingan bersifat deskriptif.',
    order: [
      'BBLR',
      'Bukan BBLR',
    ],
  },
  {
    key: 'asi_eksklusif',
    title: 'ASI Eksklusif dan Status Stunting',
    purpose:
      'Membandingkan kelompok yang memiliki riwayat ASI eksklusif Ya dan Tidak.',
    note:
      'Kategori Tidak diketahui dan Belum dapat dinilai dikeluarkan, bukan dimasukkan ke kelompok Tidak.',
    order: [
      'Tidak',
      'Ya',
    ],
  },
  {
    key: 'kunjungan_posyandu_3bln',
    title: 'Kunjungan Posyandu dan Status Stunting',
    purpose:
      'Membandingkan catatan berdasarkan jumlah kunjungan Posyandu selama tiga bulan.',
    note:
      'Perbedaan hasil antarkelompok tidak membuktikan bahwa frekuensi kunjungan menyebabkan perubahan status stunting.',
    order: [
      '0 kunjungan',
      '1 kunjungan',
      '2 kunjungan',
      '3 kunjungan',
    ],
  },
  {
    key: 'status_gizi_ibu',
    title: 'Status Gizi Ibu dan Status Stunting',
    purpose:
      'Membandingkan kelompok KEK/Risiko KEK dengan kelompok status gizi ibu Normal.',
    note:
      'KEK dan Risiko KEK digabungkan menjadi satu kategori oleh backend untuk analisis ini.',
    order: [
      'KEK/Risiko KEK',
      'Normal',
    ],
  },
];

// ======================================================
// 3. FORMAT ANGKA
// ======================================================

const formatNumber = (value: number): string =>
  value.toLocaleString('id-ID');

const formatPercent = (value: number): string =>
  `${value.toLocaleString('id-ID', {
    maximumFractionDigits: 1,
  })}%`;

// ======================================================
// 4. PERSIAPAN DATA BAR CHART
// ======================================================

function prepareFactorRows(
  groups: FactorGroup[],
  definition: FactorDefinition,
  status: string | null
): ChartRow[] {
  return groups
    .filter((group) => group.berlabel > 0)
    .map((group) => ({
      ...group,
      label: group.kategori,

      // Semua status: proporsi stunting.
      // Satu status: jumlah catatan terpilih.
      nilai: status
        ? group.berlabel
        : group.proporsi_stunting ?? 0,
    }))
    .sort((a, b) => {
      const aIndex = definition.order.indexOf(
        a.kategori
      );

      const bIndex = definition.order.indexOf(
        b.kategori
      );

      return (
        (aIndex < 0 ? 999 : aIndex) -
        (bIndex < 0 ? 999 : bIndex)
      );
    });
}

// ======================================================
// 5. KOMPONEN GRAFIK SETIAP FAKTOR
// ======================================================

function FactorChart({
  definition,
  groups,
  totalSelected,
  status,
}: {
  definition: FactorDefinition;
  groups: FactorGroup[];
  totalSelected: number;
  status: string | null;
}) {
  const rows = prepareFactorRows(
    groups,
    definition,
    status
  );

  const categorized = groups.reduce(
    (sum, group) => sum + group.total,
    0
  );

  const excluded = Math.max(
    0,
    totalSelected - categorized
  );

  const measureLabel = status
    ? `Jumlah catatan ${status}`
    : 'Proporsi stunting dalam kategori (%)';

  const chartHeight = Math.max(
    175,
    rows.length * 52 + 58
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">

      <h3 className="text-sm font-bold text-slate-900">
        {definition.title}
      </h3>

      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {definition.purpose}
      </p>

      <p className="mt-2 text-[11px] font-semibold text-teal-700">
        {measureLabel}
      </p>

      {rows.length > 0 ? (
        <div
          className="mt-3"
          style={{
            height: chartHeight,
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={rows}
              layout="vertical"
              margin={{
                left: 7,
                right: 20,
                top: 8,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#e2e8f0"
              />

              <XAxis
                type="number"
                domain={
                  status
                    ? [0, 'auto']
                    : [0, 100]
                }
                allowDecimals={!status}
                unit={status ? '' : '%'}
                tick={{
                  fontSize: 10,
                }}
              />

              <YAxis
                type="category"
                dataKey="label"
                width={124}
                tick={{
                  fontSize: 10,
                }}
              />

              <Tooltip
                formatter={(value: unknown) => {
                  const raw = Array.isArray(value)
                    ? value[0]
                    : value;

                  const number = Number(raw);

                  if (!Number.isFinite(number)) {
                    return 'Tidak tersedia';
                  }

                  return status
                    ? `${formatNumber(number)} catatan`
                    : formatPercent(number);
                }}
              />

              <Bar
                dataKey="nilai"
                name={measureLabel}
                fill="#0d9488"
                maxBarSize={27}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Tidak ada kategori dengan label stunting
          valid untuk filter ini.
        </p>
      )}

      {/* RINCIAN ANGKA AGAR GRAFIK DAPAT DIVERIFIKASI */}
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">

        {rows.map((group) => (
          <p key={group.kategori}>
            <strong>{group.kategori}:</strong>{' '}

            {status
              ? `${formatNumber(group.berlabel)} catatan ${status}`
              : `${group.stunting} stunting dari ${group.berlabel} label valid (${formatPercent(group.proporsi_stunting ?? 0)})`}

            {group.berlabel < 30 && (
              <span className="ml-1 text-amber-700">
                (sampel kecil)
              </span>
            )}
          </p>
        ))}

        <p className="pt-1 text-amber-700">
          {excluded > 0
            ? `${formatNumber(excluded)} catatan tidak masuk perbandingan karena kategori faktor tidak diketahui atau tidak valid.`
            : 'Seluruh catatan terpilih memiliki kategori faktor yang dikenali.'}
        </p>

        <p className="text-[11px] text-slate-500">
          {definition.note}
        </p>
      </div>
    </article>
  );
}

// ======================================================
// 6. HALAMAN UTAMA ANALISIS FAKTOR RISIKO
// ======================================================

export function RiskFactorPage() {
  const {
    filters,
    setFilters,
  } = useGlobalFilters();

  const [data, setData] =
    useState<AnalysisResponse | null>(null);

  const [options, setOptions] =
    useState<FilterOptions | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [refresh, setRefresh] = useState(0);

  // ====================================================
  // 7. AMBIL PILIHAN FILTER
  // ====================================================

  useEffect(() => {
    let active = true;

    fetchVisualizationData({
      region_type: 'kecamatan',
    })
      .then((result) => {
        if (
          active &&
          result.has_active_dataset
        ) {
          setOptions(result.filter_options);
        }
      })
      .catch(() => {
        // Analisis tetap dapat digunakan
        // jika pilihan filter belum berhasil dimuat.
      });

    return () => {
      active = false;
    };
  }, []);

  // ====================================================
  // 8. AMBIL DATA ANALISIS DARI FASTAPI
  // ====================================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnalysis() {
      setLoading(true);
      setError(null);

      try {
        const url = new URL(
          `${API_BASE_URL}/api/analytics/overview`
        );

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
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          let detail = `HTTP ${response.status}`;

          try {
            const body: {
              detail?: string;
            } = await response.json();

            if (body.detail) {
              detail = body.detail;
            }
          } catch {
            // Respons error tidak selalu JSON.
          }

          throw new Error(detail);
        }

        const result =
          (await response.json()) as AnalysisResponse;

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          setData(null);

          setError(
            err instanceof Error
              ? err.message
              : 'Gagal memuat analisis faktor.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAnalysis();

    return () => {
      controller.abort();
    };
  }, [filters, refresh]);

  // ====================================================
  // 9. FILTER PERIODE BULAN
  // ====================================================

  const periodOptions = useMemo(() => {
    return Array.from(
      new Set(
        (options?.periode_list ?? [])
          .map((date) =>
            date.trim().slice(0, 7)
          )
          .filter((date) =>
            /^\d{4}-\d{2}$/.test(date)
          )
      )
    ).sort();
  }, [options]);

  // ====================================================
  // 10. UPDATE GLOBAL FILTER
  // ====================================================

  const setFilter = useCallback(
    (
      key: keyof GlobalFilters,
      value: string
    ) => {
      setFilters((previous) => ({
        ...previous,
        [key]: value || null,
      }));
    },
    [setFilters]
  );

  const status = filters.status_stunting;

  const selected =
    data?.total_setelah_filter ?? 0;

  const stuntingKpi = data?.kpi.stunting;

  const unknownAsi = data
    ? Math.max(
        0,
        selected -
          (
            data.faktor_risiko.asi_eksklusif ??
            []
          ).reduce(
            (sum, group) =>
              sum + group.total,
            0
          )
      )
    : 0;

  const activeCount = Object.values(
    filters
  ).filter(Boolean).length;

  // ====================================================
  // 11. DEFINISI FILTER HALAMAN
  // ====================================================

  const filterSpecs: Array<{
    key: keyof GlobalFilters;
    label: string;
    options: string[];
  }> = [
    {
      key: 'kecamatan',
      label: 'Kecamatan',
      options:
        options?.kecamatan_list ?? [],
    },
    {
      key: 'jenis_kelamin',
      label: 'Jenis Kelamin',
      options:
        options?.jenis_kelamin_list ?? [],
    },
    {
      key: 'age_group',
      label: 'Kelompok Usia',
      options:
        options?.age_group_list ?? [],
    },
    {
      key: 'periode',
      label: 'Periode Pengukuran',
      options: periodOptions,
    },
    {
      key: 'status_stunting',
      label: 'Status Stunting',
      options: [
        'Stunting',
        'Tidak Stunting',
      ],
    },
  ];

  // ====================================================
  // 12. TAMPILAN HALAMAN
  // ====================================================

  return (
    <section className="space-y-5">

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Analisis Faktor Risiko Stunting
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Perbandingan deskriptif BBLR, ASI eksklusif,
            kunjungan Posyandu, dan status gizi ibu.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setRefresh((value) => value + 1)
          }
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          Segarkan Analisis
        </button>
      </div>

      {/* FILTER GLOBAL */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">

        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <BarChart3 className="h-4 w-4 text-teal-600" />
            Filter Bersama
          </h3>

          <button
            type="button"
            onClick={() =>
              setFilters({
                kecamatan: null,
                jenis_kelamin: null,
                age_group: null,
                periode: null,
                status_stunting: null,
              })
            }
            disabled={!activeCount}
            className="flex items-center gap-1 text-xs text-teal-700 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset ({activeCount})
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">

          {filterSpecs.map((spec) => (
            <label
              key={spec.key}
              className="text-xs font-medium text-slate-600"
            >
              {spec.label}

              <select
                value={filters[spec.key] ?? ''}
                onChange={(event) =>
                  setFilter(
                    spec.key,
                    event.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="">
                  Semua
                </option>

                {spec.options.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          Filter yang sama digunakan oleh Dashboard Utama
          dan Visualisasi Interaktif.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* PEMBERITAHUAN JIKA STATUS DIFILTER */}
      {status && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Filter Status Stunting = {status} aktif.
          Grafik menampilkan JUMLAH catatan per kategori,
          bukan proporsi stunting.

          Pilih Semua pada Status Stunting untuk
          membandingkan proporsi antarkelompok.
        </p>
      )}

      {/* HASIL ANALISIS */}
      {data && (
        <>

          {/* EMPAT KPI */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

            {[
              {
                label: 'Catatan Terpilih',
                value: formatNumber(selected),
                detail:
                  'Jumlah catatan setelah filter.',
              },
              {
                label: 'Kasus Stunting',
                value: formatNumber(
                  stuntingKpi?.pembilang ?? 0
                ),
                detail:
                  'Label stunting valid sesuai filter.',
              },
              {
                label: 'Proporsi Stunting Dataset',

                value:
                  status ||
                  stuntingKpi?.persentase == null
                    ? '—'
                    : formatPercent(
                        stuntingKpi.persentase
                      ),

                detail: status
                  ? 'Tidak ditampilkan ketika status difilter.'
                  : 'Kasus stunting / seluruh label valid.',
              },
              {
                label: 'Kategori ASI Tidak Diketahui',
                value: formatNumber(unknownAsi),
                detail:
                  'Tidak dimasukkan dalam perbandingan ASI.',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-xs text-slate-500">
                  {card.label}
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {card.value}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {card.detail}
                </p>
              </div>
            ))}
          </div>

          {/* EMPAT GRAFIK */}
          {selected === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Tidak ada catatan yang cocok dengan
              kombinasi filter ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

              {FACTORS.map((definition) => (
                <FactorChart
                  key={definition.key}
                  definition={definition}
                  groups={
                    data.faktor_risiko[
                      definition.key
                    ] ?? []
                  }
                  totalSelected={selected}
                  status={status}
                />
              ))}
            </div>
          )}

          {/* CATATAN INTERPRETASI */}
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <strong>Catatan interpretasi:</strong>{' '}
            Seluruh persentase adalah proporsi dalam
            dataset yang dianalisis, bukan prevalensi
            resmi Kabupaten Toba.

            Perbandingan bersifat deskriptif dan
            tidak membuktikan sebab-akibat.

            Perbedaan antarkelompok dapat dipengaruhi
            usia, wilayah, faktor sosial, maupun
            karakteristik data yang belum dikendalikan.

            Periksa jumlah catatan valid setiap kategori
            sebelum menarik kesimpulan.
          </p>
        </>
      )}

      {loading && (
        <p className="text-xs font-medium text-teal-700">
          Memuat analisis faktor risiko…
        </p>
      )}
    </section>
  );
}
