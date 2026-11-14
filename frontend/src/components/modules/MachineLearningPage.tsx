
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  BrainCircuit,
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

import { API_BASE_URL } from '../../services/api';

// ======================================================
// 1. TIPE RESPONS MACHINE LEARNING
// ======================================================

type ConfusionMatrix = [[number, number], [number, number]];

type ModelMetric = {
  model: string;
  accuracy: number;
  precision_stunting: number;
  recall_stunting: number;
  f1_stunting: number;
  roc_auc: number;
  cv_train_f1: number;
  confusion_matrix: ConfusionMatrix;
  parameter_terbaik: Record<string, number | string | null>;
};

type MLReport = {
  trained: boolean;
  message?: string;
  model_terpilih?: string;
  fitur?: string[];
  metrik?: ModelMetric[];
  jumlah_train?: number;
  jumlah_test?: number;
  baris_dikecualikan?: Record<string, number>;
  waktu_utc?: string;
  peringatan?: string;
};

type Prediction = {
  kelas_prediksi: number;
  label: string;
  probabilitas_kelas_stunting: number;
  model: string;
  catatan: string;
};

// ======================================================
// 2. DEFINISI FITUR MODEL
// ======================================================

const labels: Record<string, string> = {
  usia_saat_ukur: 'Usia balita (bulan)',
  berat_lahir: 'Berat lahir (kg)',
  usia_ibu_tahun: 'Usia ibu (tahun)',
  kunjungan_posyandu_3bln: 'Kunjungan Posyandu (3 bulan)',
  jenis_kelamin: 'Jenis kelamin',
  status_gizi_ibu: 'Status gizi ibu',
  asi_eksklusif: 'ASI eksklusif',
  sanitasi_layak: 'Sanitasi layak',
  riwayat_diare_3bln: 'Riwayat diare 3 bulan',
  akses_air_bersih: 'Akses air bersih',
  pendidikan_ibu: 'Pendidikan ibu',
  imunisasi_sesuai_usia: 'Imunisasi sesuai usia',
};

const numeric: Record<
  string,
  { min: number; max: number; step: string }
> = {
  usia_saat_ukur: { min: 0, max: 59, step: '1' },
  berat_lahir: { min: 0.3, max: 8, step: '0.01' },
  usia_ibu_tahun: { min: 10, max: 65, step: '1' },
  kunjungan_posyandu_3bln: {
    min: 0,
    max: 3,
    step: '1',
  },
};

const choices: Record<string, string[]> = {
  jenis_kelamin: ['L', 'P'],
  status_gizi_ibu: ['Normal', 'KEK', 'Risiko KEK'],
  asi_eksklusif: ['Ya', 'Tidak'],
  sanitasi_layak: ['Ya', 'Tidak'],
  riwayat_diare_3bln: ['Ya', 'Tidak'],
  akses_air_bersih: ['Ya', 'Tidak'],
  pendidikan_ibu: [
    'Tidak Sekolah',
    'SD',
    'SMP',
    'SMA',
    'D3',
    'S1',
  ],
  imunisasi_sesuai_usia: ['Ya', 'Tidak'],
};

const numberFormat = (value: number) =>
  value.toLocaleString('id-ID');

const percentage = (value: number) =>
  `${(value * 100).toLocaleString('id-ID', {
    maximumFractionDigits: 1,
  })}%`;

// ======================================================
// 3. REQUEST API
// ======================================================

async function api<T>(
  path: string,
  body?: object
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      method: body ? 'POST' : 'GET',
      headers: {
        Accept: 'application/json',
        ...(body
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      ...(body
        ? { body: JSON.stringify(body) }
        : {}),
    }
  );

  if (!response.ok) {
    let reason = `HTTP ${response.status}`;

    try {
      const payload: {
        detail?: string | { msg?: string }[];
      } = await response.json();

      if (typeof payload.detail === 'string') {
        reason = payload.detail;
      } else if (Array.isArray(payload.detail)) {
        reason = payload.detail
          .map((item) => item.msg ?? 'Input tidak valid')
          .join('; ');
      }
    } catch {
      // Respons kegagalan dapat berupa non-JSON.
    }

    throw new Error(reason);
  }

  return (await response.json()) as T;
}

// ======================================================
// 4. KARTU RINGKASAN
// ======================================================

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  );
}

// ======================================================
// 5. HALAMAN MACHINE LEARNING
// ======================================================

export function MachineLearningPage() {
  const [report, setReport] =
    useState<MLReport | null>(null);

  const [input, setInput] =
    useState<Record<string, string>>({});

  const [prediction, setPrediction] =
    useState<Prediction | null>(null);

  const [consent, setConsent] = useState(false);

  const [busy, setBusy] = useState<
    'train' | 'predict' | 'refresh' | null
  >(null);

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const [initialLoading, setInitialLoading] =
    useState(true);

  // ====================================================
  // 6. MEMUAT STATUS MODEL
  // ====================================================

  const refresh = useCallback(async () => {
    const result = await api<MLReport>(
      '/api/ml/metrics'
    );

    setReport(result);
    setPrediction(null);
  }, []);

  useEffect(() => {
    let active = true;

    void api<MLReport>('/api/ml/metrics')
      .then((result) => {
        if (active) {
          setReport(result);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Gagal membaca status model.'
          );
        }
      })
      .finally(() => {
        if (active) {
          setInitialLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // ====================================================
  // 7. MELATIH TIGA ALGORITMA
  // ====================================================

  async function train() {
    if (!consent || busy) return;

    setBusy('train');
    setError(null);
    setNotice(null);
    setPrediction(null);

    try {
      const result = await api<MLReport>(
        '/api/ml/train',
        { setuju: true }
      );

      if (!result.trained) {
        throw new Error(
          'Backend belum mengonfirmasi pelatihan.'
        );
      }

      setReport(result);
      setConsent(false);
      setInput({});

      setNotice(
        'Pelatihan tiga algoritma selesai. Metrik berasal dari data uji yang tidak digunakan untuk tuning.'
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Pelatihan gagal.'
      );
    } finally {
      setBusy(null);
    }
  }

  // ====================================================
  // 8. PREDIKSI DARI MODEL TERLATIH
  // ====================================================

  async function predict() {
    if (!report?.trained || busy) return;

    setError(null);
    setNotice(null);
    setPrediction(null);

    const age = input.usia_saat_ukur?.trim();

    if (
      !age ||
      !Number.isInteger(Number(age)) ||
      Number(age) < 0 ||
      Number(age) > 59
    ) {
      setError(
        'Usia balita harus diisi dengan bilangan bulat 0–59 bulan.'
      );
      return;
    }

    const fitur: Record<
      string,
      number | string | null
    > = {};

    for (const key of report.fitur ?? []) {
      const value = input[key]?.trim() ?? '';

      if (key in numeric) {
        if (value === '') {
          fitur[key] = null;
        } else {
          const n = Number(value);
          const limits = numeric[key];

          if (
            !Number.isFinite(n) ||
            n < limits.min ||
            n > limits.max ||
            (
              limits.step === '1' &&
              !Number.isInteger(n)
            )
          ) {
            setError(
              `Periksa nilai ${labels[key] ?? key}: di luar rentang atau bukan angka valid.`
            );
            return;
          }

          fitur[key] = n;
        }
      } else {
        fitur[key] = value || null;
      }
    }

    setBusy('predict');

    try {
      const result = await api<Prediction>(
        '/api/ml/predict',
        { fitur }
      );

      setPrediction(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Prediksi gagal.'
      );
    } finally {
      setBusy(null);
    }
  }

  // ====================================================
  // 9. MEMUAT ULANG METRIK
  // ====================================================

  async function reload() {
    setBusy('refresh');
    setError(null);

    try {
      await refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat metrik.'
      );
    } finally {
      setBusy(null);
    }
  }

  // ====================================================
  // 10. DATA EVALUASI
  // ====================================================

  const models = report?.metrik ?? [];

  const selected = models.find(
    (model) =>
      model.model === report?.model_terpilih
  );

  const f1Comparison = useMemo(
    () =>
      models.map((model) => ({
        model: model.model,
        skor: Number(
          (model.f1_stunting * 100).toFixed(1)
        ),
      })),
    [models]
  );

  const cm = selected?.confusion_matrix;

  // Patokan berdasarkan distribusi kelas uji.
  const baseline = cm
    ? Math.max(
        cm[0][0] + cm[0][1],
        cm[1][0] + cm[1][1]
      ) /
      (
        cm[0][0] + cm[0][1] +
        cm[1][0] + cm[1][1]
      )
    : null;

  const unused = (
    report?.baris_dikecualikan
      ? Object.values(
          report.baris_dikecualikan
        )
      : []
  ).reduce(
    (a, b) => a + b,
    0
  );

  const missingCount = (
    report?.fitur ?? []
  ).filter(
    (key) => !(input[key]?.trim())
  ).length;

  // ====================================================
  // 11. RENDER HALAMAN
  // ====================================================

  return (
    <section className="space-y-5">

      {/* HEADER */}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Klasifikasi Machine Learning
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Pelatihan, evaluasi, dan prediksi dari
            model FastAPI, bukan simulasi frontend.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void reload()}
          disabled={busy !== null || initialLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              busy === 'refresh'
                ? 'animate-spin'
                : ''
            }`}
          />
          Segarkan Status
        </button>
      </div>

      {/* PERINGATAN AKADEMIK */}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <strong>
          Eksperimen akademik, bukan diagnosis.
        </strong>
        {' '}
        Target berasal dari status TB/U; model tidak
        memakai Z-score TB/U, status TB/U, atau tinggi
        badan sebagai prediktor. Skor probabilitas
        belum dikalibrasi sebagai risiko klinis.
        Pelatihan selalu menggunakan dataset aktif
        lengkap, bukan hasil filter Dashboard.
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {notice && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}

      {/* ============================================ */}
      {/* BAGIAN 1: PELATIHAN MODEL */}
      {/* ============================================ */}

      <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-teal-600" />

          <h3 className="text-sm font-bold">
            1. Pelatihan Tiga Model
          </h3>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          Model: Logistic Regression, Decision Tree,
          Random Forest. Pembagian data latih/uji 80:20
          secara stratified; tuning hyperparameter
          memakai cross-validation 3 fold pada data
          latih, dengan F1 stunting sebagai kriteria
          pemilihan model. Data uji digunakan untuk
          evaluasi akhir.
        </p>

        <label className="mt-4 flex items-start gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) =>
              setConsent(event.target.checked)
            }
            disabled={busy !== null}
          />

          <span>
            Saya memahami pelatihan memakai dataset
            aktif lengkap dan akan mengganti hasil
            model sebelumnya.
          </span>
        </label>

        <button
          type="button"
          onClick={() => void train()}
          disabled={
            !consent ||
            busy !== null ||
            initialLoading
          }
          className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'train'
            ? 'Sedang melatih dan mengevaluasi model…'
            : report?.trained
              ? 'Latih Ulang Tiga Model'
              : 'Latih Tiga Model'}
        </button>

        {initialLoading && (
          <p className="mt-2 text-xs text-slate-500">
            Memeriksa model yang sudah dilatih…
          </p>
        )}

        {report && !report.trained && (
          <p className="mt-2 text-xs text-amber-800">
            {report.message ?? 'Model belum dilatih.'}
          </p>
        )}
      </article>

      {report?.trained && (
        <>

          {/* ======================================== */}
          {/* KPI PELATIHAN */}
          {/* ======================================== */}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

            <SummaryCard
              label="Model terpilih"
              value={
                report.model_terpilih ?? '—'
              }
              description="Dipilih dari CV F1 data latih, bukan skor tertinggi pada data uji."
            />

            <SummaryCard
              label="Data latih"
              value={numberFormat(
                report.jumlah_train ?? 0
              )}
              description="80% catatan berlabel yang memenuhi syarat."
            />

            <SummaryCard
              label="Data uji"
              value={numberFormat(
                report.jumlah_test ?? 0
              )}
              description="20% untuk evaluasi akhir."
            />

            <SummaryCard
              label="Baris dikecualikan"
              value={numberFormat(unused)}
              description="Label kosong, konflik label, atau usia di luar rentang."
            />
          </div>

          {/* ======================================== */}
          {/* BAGIAN 2: EVALUASI MODEL */}
          {/* ======================================== */}

          <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">

            <h3 className="text-sm font-bold text-slate-900">
              2. Perbandingan Evaluasi Model
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Nilai pada tabel adalah hasil evaluasi
              data uji; CV F1 berasal dari data latih.
              Semakin tinggi metrik bukan otomatis
              berarti layak secara klinis.
            </p>

            {/* TABEL METRIK */}

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[730px] text-xs">

                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="p-2">Algoritma</th>
                    <th className="p-2 text-right">Accuracy</th>
                    <th className="p-2 text-right">Precision</th>
                    <th className="p-2 text-right">Recall</th>
                    <th className="p-2 text-right">F1</th>
                    <th className="p-2 text-right">ROC-AUC</th>
                    <th className="p-2 text-right">CV F1</th>
                  </tr>
                </thead>

                <tbody>
                  {models.map((model) => (
                    <tr
                      key={model.model}
                      className="border-b last:border-0"
                    >
                      <td className="p-2 font-semibold">
                        {model.model}

                        {model.model ===
                        report.model_terpilih
                          ? ' (terpilih)'
                          : ''}
                      </td>

                      <td className="p-2 text-right">
                        {percentage(model.accuracy)}
                      </td>

                      <td className="p-2 text-right">
                        {percentage(
                          model.precision_stunting
                        )}
                      </td>

                      <td className="p-2 text-right">
                        {percentage(
                          model.recall_stunting
                        )}
                      </td>

                      <td className="p-2 text-right">
                        {percentage(
                          model.f1_stunting
                        )}
                      </td>

                      <td className="p-2 text-right">
                        {model.roc_auc.toFixed(3)}
                      </td>

                      <td className="p-2 text-right">
                        {percentage(
                          model.cv_train_f1
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">

              {/* BAR CHART F1 */}

              <div>
                <h4 className="text-xs font-semibold">
                  Perbandingan F1 Stunting pada Data Uji
                </h4>

                <p className="mt-1 text-[11px] text-slate-500">
                  Horizontal bar chart membandingkan
                  tiga algoritma dengan metrik yang sama.
                </p>

                <div className="mt-2 h-52">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={f1Comparison}
                      layout="vertical"
                      margin={{
                        left: 10,
                        right: 15,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        unit="%"
                      />

                      <YAxis
                        type="category"
                        dataKey="model"
                        width={125}
                        tick={{ fontSize: 11 }}
                      />

                      <Tooltip
                        formatter={(value: unknown) =>
                          `${Number(
                            Array.isArray(value)
                              ? value[0]
                              : value
                          ).toFixed(1)}%`
                        }
                      />

                      <Bar
                        dataKey="skor"
                        name="F1 stunting (%)"
                        fill="#0d9488"
                        maxBarSize={26}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CONFUSION MATRIX */}

              <div>
                <h4 className="text-xs font-semibold">
                  Confusion Matrix — {report.model_terpilih}
                </h4>

                {cm ? (
                  <>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Baris = label sebenarnya,
                      kolom = hasil prediksi.
                    </p>

                    <table className="mt-3 w-full border-collapse text-center text-xs">

                      <thead>
                        <tr>
                          <th className="border p-2">
                            Aktual / Prediksi
                          </th>

                          <th className="border p-2">
                            Tidak Stunting
                          </th>

                          <th className="border p-2">
                            Stunting
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          <th className="border p-2 text-left">
                            Tidak Stunting
                          </th>

                          <td className="border bg-slate-50 p-2">
                            {cm[0][0]} (TN)
                          </td>

                          <td className="border bg-amber-50 p-2">
                            {cm[0][1]} (FP)
                          </td>
                        </tr>

                        <tr>
                          <th className="border p-2 text-left">
                            Stunting
                          </th>

                          <td className="border bg-amber-50 p-2">
                            {cm[1][0]} (FN)
                          </td>

                          <td className="border bg-slate-50 p-2">
                            {cm[1][1]} (TP)
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {baseline !== null && (
                      <p className="mt-3 text-[11px] text-amber-800">
                        Patokan akurasi kelas mayoritas
                        pada data uji:{' '}
                        {percentage(baseline)}.
                        Bandingkan dengan accuracy model;
                        akurasi saja tidak cukup menilai
                        deteksi stunting.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Confusion matrix belum tersedia.
                  </p>
                )}
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              F1 menyeimbangkan precision dan recall.
              Recall stunting mengukur proporsi kasus
              stunting yang terdeteksi; ROC-AUC menilai
              pemisahan kelas. Tidak ada ambang kelayakan
              klinis yang dapat disimpulkan dari
              pengujian ini.
            </p>
          </article>

          {/* ======================================== */}
          {/* BAGIAN 3: FORM PREDIKSI */}
          {/* ======================================== */}

          <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">

            <h3 className="text-sm font-bold text-slate-900">
              3. Prediksi Menggunakan Model Terlatih
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Hanya fitur yang benar-benar digunakan
              model yang ditampilkan. Kolom yang tidak
              diketahui boleh dikosongkan dan akan
              diimputasi oleh pipeline; usia balita
              wajib diisi.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">

              {(report.fitur ?? []).map((key) => (
                <label
                  key={key}
                  className="text-xs font-medium text-slate-700"
                >
                  {labels[key] ?? key}

                  {key === 'usia_saat_ukur'
                    ? ' *'
                    : ''}

                  {key in numeric ? (
                    <input
                      type="number"
                      min={numeric[key].min}
                      max={numeric[key].max}
                      step={numeric[key].step}
                      value={input[key] ?? ''}
                      onChange={(event) =>
                        setInput((old) => ({
                          ...old,
                          [key]: event.target.value,
                        }))
                      }
                      placeholder="Belum diketahui"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                  ) : key in choices ? (
                    <select
                      value={input[key] ?? ''}
                      onChange={(event) =>
                        setInput((old) => ({
                          ...old,
                          [key]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="">
                        Tidak diketahui
                      </option>

                      {choices[key].map((option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={input[key] ?? ''}
                      onChange={(event) =>
                        setInput((old) => ({
                          ...old,
                          [key]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">

              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void predict()}
                className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {busy === 'predict'
                  ? 'Menghitung prediksi…'
                  : 'Prediksi dengan Model Terlatih'}
              </button>

              <p className="text-[11px] text-amber-800">
                {missingCount} dari{' '}
                {(report.fitur ?? []).length}
                {' '}fitur masih kosong. Isilah
                sebanyak mungkin data yang valid.
              </p>
            </div>

            {prediction && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">

                <p className="text-xs font-semibold">
                  Hasil klasifikasi:
                  {' '}{prediction.label}
                </p>

                <p className="mt-1 text-lg font-bold">
                  Skor probabilitas kelas Stunting:
                  {' '}{percentage(
                    prediction.probabilitas_kelas_stunting
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Algoritma: {prediction.model}.
                  {' '}{prediction.catatan}
                </p>

                <p className="mt-2 text-xs text-amber-800">
                  Skor ini belum dikalibrasi dan
                  tidak boleh dijadikan dasar keputusan
                  medis atau diagnosis.
                </p>
              </div>
            )}
          </article>
        </>
      )}
    </section>
  );
}
