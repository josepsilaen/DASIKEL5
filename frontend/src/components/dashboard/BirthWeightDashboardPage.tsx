import React from 'react';
import { Scale, AlertCircle, FileSpreadsheet } from 'lucide-react';
import type { DashboardSummaryResponse } from '../../types/dashboard';
import { BirthWeightKpiCard } from './BirthWeightKpiCard';
import { VerticalBoxPlot } from './VerticalBoxPlot';
import { BblrPrevalenceBarChart } from './BblrPrevalenceBarChart';
import { BirthWeightScatterPlot } from './BirthWeightScatterPlot';
import { BirthWeightLegend } from './BirthWeightLegend';

interface BirthWeightDashboardPageProps {
  dashboardData: DashboardSummaryResponse;
  onGoToDataBalita: () => void;
}

export const BirthWeightDashboardPage: React.FC<BirthWeightDashboardPageProps> = ({
  dashboardData,
  onGoToDataBalita,
}) => {
  const section1 = dashboardData.tableau_analytics?.section1_birth_weight;

  // Jika kolom berat lahir belum tersedia atau belum dipetakan
  if (!section1 || !section1.has_column) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-6 sm:p-8 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-800">
              Analisis Pengaruh Berat Lahir terhadap Risiko Stunting
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              {section1?.unmapped_reason ||
                'Kolom data berat lahir (kg) balita belum teridentifikasi atau belum dipetakan dari berkas dataset aktif.'}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Berkas aktif saat ini: <strong>{dashboardData.filename || 'Dataset Balita'}</strong> ({dashboardData.total_records.toLocaleString('id-ID')} baris).
            </p>
            <button
              onClick={onGoToDataBalita}
              type="button"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-400" />
              Buka Halaman Data Balita & Petakan Kolom
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1">
      {/* 1. Subheader Analisis & Legenda Konsisten */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Pengaruh Berat Lahir terhadap Risiko Stunting
            </h2>
            <p className="text-xs text-slate-500">
              Visualisasi hubungan berat lahir rendah (BBLR &lt; 2,5 kg) terhadap Z-Score TB/U ({section1.total_valid.toLocaleString('id-ID')} balita valid)
            </p>
          </div>
        </div>

        {/* Legenda Status & Kategori */}
        <BirthWeightLegend />
      </div>

      {/* 2. Baris Pertama: Dua KPI Berdampingan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KPI Kiri: Persentase BBLR */}
        <BirthWeightKpiCard
          title="KPI Persentase BBLR"
          value={`${section1.bblr_rate_overall.toFixed(1)}%`}
          countLabel={`(${section1.bblr_count.toLocaleString('id-ID')} dari ${section1.total_valid.toLocaleString('id-ID')} balita)`}
          description="Persentase balita dengan berat lahir <2,5 kg dari seluruh balita dengan berat lahir valid."
          variant="blue"
          badgeText="BBLR < 2,5 kg"
        />

        {/* KPI Kanan: Prevalensi Stunting pada BBLR */}
        <BirthWeightKpiCard
          title="KPI BBLR Stunting"
          value={`${section1.bblr_stunting_rate.toFixed(1)}%`}
          countLabel={`(${section1.bblr_stunting_count.toLocaleString('id-ID')} dari ${section1.bblr_count.toLocaleString('id-ID')} balita BBLR)`}
          description="Prevalensi stunting pada kelompok balita yang memiliki riwayat BBLR."
          variant="red"
          badgeText="Prevalensi Stunting"
        />
      </div>

      {/* 3. Baris Kedua: Dua Grafik Berdampingan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Kiri: Box Plot Berat Lahir Vertikal */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-2 pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Distribusi Berat Lahir Berdasarkan Status Stunting
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Box plot berat lahir (kg) pada kelompok Stunting vs Tidak Stunting
              </p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Sumbu Y: Berat Lahir (kg)
            </span>
          </div>

          <VerticalBoxPlot
            stuntingStats={section1.boxplot_stunting}
            normalStats={section1.boxplot_normal}
            threshold={2.5}
          />
        </div>

        {/* Kanan: Bar Chart Prevalensi BBLR */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-2 pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Prevalensi BBLR
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Prevalensi stunting pada kelompok BBLR (&lt;2,5 kg) vs Normal (&ge;2,5 kg)
              </p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Sumbu Y: Prevalensi (%)
            </span>
          </div>

          <BblrPrevalenceBarChart categories={section1.categories} />
        </div>
      </div>

      {/* 4. Baris Ketiga: Scatter Plot Selebar Halaman */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="mb-2 pb-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              Hubungan Berat Lahir dengan Z-score TB/U
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Satu titik mewakili satu balita dari dataset aktif
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-rose-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Stunting
            </span>
            <span className="flex items-center gap-1.5 text-blue-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              Tidak Stunting
            </span>
          </div>
        </div>

        <BirthWeightScatterPlot scatterSample={section1.scatter_sample} />
      </div>
    </div>
  );
};
