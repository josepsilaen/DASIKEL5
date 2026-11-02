import React from 'react';
import {
  Layers,
  ArrowRight,
  Database,
  Sliders,
  CheckCircle,
  FileCode,
  Lock,
  Workflow,
} from 'lucide-react';

export const ProjectOverview: React.FC = () => {
  const roadmapStages = [
    {
      stage: 'Tahap 1',
      title: 'Setup Fondasi & Health Check API',
      status: 'Selesai',
      current: true,
      desc: 'Inisialisasi arsitektur React + TypeScript + Tailwind dan FastAPI + Pydantic dengan endpoint verifikasi koneksi.',
    },
    {
      stage: 'Tahap 2',
      title: 'Skema & Manajemen Data Balita (Dummy)',
      status: 'Akan Datang',
      current: false,
      desc: 'Perancangan skema data simulasi balita (usia, jenis kelamin, tinggi badan, berat badan, pola asuh, sanitasi).',
    },
    {
      stage: 'Tahap 3',
      title: 'Analisis Faktor Risiko & Visualisasi',
      status: 'Akan Datang',
      current: false,
      desc: 'Eksplorasi korelasi variabel risiko (asupan nutrisi, imunisasi, air bersih) terhadap indikator status gizi.',
    },
    {
      stage: 'Tahap 4',
      title: 'Integrasi Model Prediksi Machine Learning',
      status: 'Akan Datang',
      current: false,
      desc: 'Pelatihan dan inferensi model klasifikasi risiko stunting dengan validasi metrik akurasi terukur.',
    },
    {
      stage: 'Tahap 5',
      title: 'Dashboard Komprehensif & Pelaporan',
      status: 'Akan Datang',
      current: false,
      desc: 'Antarmuka monitoring terpadu per kecamatan di Kabupaten Toba dengan ekspor laporan evaluasi.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-7 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-4">
            <Layers className="w-3.5 h-3.5" />
            <span>Fondasi Arsitektur Modern Full-Stack</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight mb-2">
            Inisiatif Digital Penanggulangan Stunting Kabupaten Toba
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Aplikasi ini dibangun untuk membantu identifikasi dini faktor determinan risiko stunting
            pada balita melalui integrasi analisis data modern dan antarmuka ramah pengguna.
            Pada tahap ini, fondasi komunikasi data antara frontend React dan backend FastAPI telah berhasil disiapkan.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-700/60">
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Frontend</div>
              <div className="text-sm font-bold text-white mt-0.5">React 19 + TS</div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Build Tool</div>
              <div className="text-sm font-bold text-white mt-0.5">Vite + Tailwind v4</div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Backend</div>
              <div className="text-sm font-bold text-white mt-0.5">FastAPI + Python 3.13</div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/40">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Validasi</div>
              <div className="text-sm font-bold text-white mt-0.5">Pydantic v2</div>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -bottom-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Architecture & Flow Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Workflow className="w-5 h-5 text-blue-600" />
          <h4 className="font-bold text-slate-800 text-base">
            Alur Komunikasi Frontend → API → Backend
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-600">Langkah 1</span>
              <FileCode className="w-4 h-4 text-slate-400" />
            </div>
            <div className="font-semibold text-slate-800 text-sm">Frontend Service</div>
            <p className="text-xs text-slate-500 mt-1">
              Komponen memanggil <code className="text-blue-700">api.ts</code> via fungsi native Fetch API.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-600">Langkah 2</span>
              <Lock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="font-semibold text-slate-800 text-sm">CORS Middleware</div>
            <p className="text-xs text-slate-500 mt-1">
              FastAPI memvalidasi origin request (<code className="text-blue-700">:5173</code> diizinkan).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-600">Langkah 3</span>
              <Sliders className="w-4 h-4 text-slate-400" />
            </div>
            <div className="font-semibold text-slate-800 text-sm">Router & Endpoint</div>
            <p className="text-xs text-slate-500 mt-1">
              Handler <code className="text-blue-700">/api/health</code> memproses request dan merakit objek respon.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-600">Langkah 4</span>
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            <div className="font-semibold text-slate-800 text-sm">Pydantic Serialization</div>
            <p className="text-xs text-slate-500 mt-1">
              Skema Pydantic memvalidasi tipe data dan mengembalikan JSON terstruktur ke browser.
            </p>
          </div>
        </div>
      </div>

      {/* Roadmap Stages */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h4 className="font-bold text-slate-800 text-base mb-1">
          Rencana Pengembangan Bertahap (Roadmap)
        </h4>
        <p className="text-xs text-slate-500 mb-5">
          Proyek ini dirancang secara terstruktur dan modular sesuai pedoman pengembangan bertahap.
        </p>

        <div className="space-y-3">
          {roadmapStages.map((item) => (
            <div
              key={item.stage}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                item.current
                  ? 'bg-blue-50/50 border-blue-200 shadow-2xs'
                  : 'bg-white border-slate-200/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                    item.current
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {item.current ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700">{item.stage}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-800 text-sm">{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                </div>
              </div>

              <div className="flex-shrink-0 sm:self-center">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                    item.current
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
