
import React from 'react';
import {
  ArrowRight,
  BarChart3,
  Database,
  Info,
  Layers,
  ShieldCheck,
} from 'lucide-react';

import type {
  ModulePageId,
  PageId,
} from '../../types/navigation';

interface Props {
  page: ModulePageId;
  hasActiveDataset: boolean | null;
  onNavigate: (page: PageId) => void;
}

const modules: Record<
  ModulePageId,
  {
    title: string;
    description: string;
    items: [string, string, string];
  }
> = {
  analisis: {
    title: 'Analisis Faktor Risiko',
    description:
      'Membandingkan proporsi stunting menurut karakteristik balita, ibu, dan layanan kesehatan.',
    items: [
      'BBLR dan berat lahir',
      'ASI eksklusif serta kehadiran Posyandu',
      'Status gizi ibu dan faktor tambahan yang tersedia',
    ],
  },

  wilayah: {
    title: 'Perbandingan Wilayah',
    description:
      'Membandingkan jumlah catatan dan proporsi stunting antarkecamatan di wilayah kajian.',
    items: [
      'Tabel perbandingan kecamatan',
      'Peringkat berdasarkan proporsi teramati',
      'Drill-down kecamatan ke desa saat data mendukung',
    ],
  },

  tren: {
    title: 'Tren Stunting 2025–2026',
    description:
      'Menganalisis waktu pengukuran yang benar-benar tersedia di dataset aktif, bukan tahun historis yang berbeda.',
    items: [
      'Tren proporsi bulanan dan tahunan',
      'Perbandingan status stunting per periode',
      'Penjelasan cakupan bulan dan keterbatasan perbandingan',
    ],
  },

  'machine-learning': {
    title: 'Klasifikasi Machine Learning',
    description:
      'Menggunakan model dari FastAPI untuk pelatihan, evaluasi, dan klasifikasi, bukan rumus simulasi UI.',
    items: [
      'Logistic Regression, Decision Tree, Random Forest',
      'Confusion matrix, precision, recall, F1, ROC-AUC',
      'Form input dan hasil prediksi dari model terlatih',
    ],
  },
};

export const ModuleOverviewPage: React.FC<Props> = ({
  page,
  hasActiveDataset,
  onNavigate,
}) => {
  const module = modules[page];

  const status =
    hasActiveDataset === null
      ? 'Status dataset belum dapat dipastikan.'
      : hasActiveDataset
        ? 'Dataset aktif terdeteksi. Integrasi fitur ini akan dibuat pada tahap berikutnya.'
        : 'Belum ada dataset aktif. Unggah dan validasi dataset terlebih dahulu.';

  return (
    <div className="space-y-5">
      {/* Judul halaman */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {module.title}
        </h1>

        <p className="text-[14px] text-slate-500 mt-1 leading-relaxed">
          {module.description}
        </p>
      </div>

      {/* Status implementasi */}
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 flex gap-3 items-start">
        <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />

        <div>
          <p className="text-[13px] font-bold text-teal-900">
            Halaman tersedia — fitur analisis belum diintegrasikan
          </p>

          <p className="text-[13px] text-teal-800 mt-1 leading-relaxed">
            {status}
          </p>
        </div>
      </div>

      {/* Komponen yang akan dibangun */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {module.items.map((item, index) => (
          <article
            key={item}
            className="rounded-xl bg-white border border-slate-200 p-5"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 mb-4">
              {index === 0 ? (
                <BarChart3 className="w-5 h-5" />
              ) : index === 1 ? (
                <Layers className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>

            <p className="text-[12px] font-semibold text-slate-500">
              Rencana komponen {index + 1}
            </p>

            <h2 className="text-[14px] font-bold text-slate-900 mt-1 leading-relaxed">
              {item}
            </h2>
          </article>
        ))}
      </div>

      {/* Navigasi ke halaman existing */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-start">
          <Database className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />

          <div>
            <h2 className="text-[14px] font-bold text-slate-900">
              Sumber data terpusat
            </h2>

            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
              Semua modul nantinya memakai dataset aktif dan hasil
              perhitungan FastAPI yang sama.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('data-balita')}
            className="px-3 py-2.5 text-[13px] rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 inline-flex items-center gap-2"
          >
            Kelola Data
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('visualisasi')}
            className="px-3 py-2.5 text-[13px] rounded-lg font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50"
          >
            Lihat Visualisasi
          </button>
        </div>
      </div>
    </div>
  );
};
