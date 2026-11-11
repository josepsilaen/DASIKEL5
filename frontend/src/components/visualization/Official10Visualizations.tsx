import React, { useState } from 'react';
import {
  Scale,
  Calendar,
  MapPin,
  TrendingUp,
  Layers,
  RotateCcw,
  Users,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import type { DashboardTableauAnalytics } from '../../types/dashboard';
import { BirthFactorsSection } from './components/BirthFactorsSection';
import { AgeCohortSection } from './components/AgeCohortSection';
import { RegionalSpreadSection } from './components/RegionalSpreadSection';
import { RelationshipTrendSection } from './components/RelationshipTrendSection';
import { AdditionalAnalysisSection } from './components/AdditionalAnalysisSection';

export type OfficialVizTab = 'all' | 'kelahiran' | 'usia' | 'wilayah' | 'tren' | 'tambahan';

interface Official10VisualizationsProps {
  analytics?: DashboardTableauAnalytics | null;
  totalBalita: number;
  totalFiltered: number;
  stuntedCount: number;
  stuntingPercentage: number;
  selectedDesa: string | null;
  onSelectDesa: (desa: string) => void;
  onResetDesa: () => void;
  onGoToDataBalita: () => void;
}

export const Official10Visualizations: React.FC<Official10VisualizationsProps> = ({
  analytics,
  totalBalita,
  totalFiltered,
  stuntedCount,
  stuntingPercentage,
  selectedDesa,
  onSelectDesa,
  onResetDesa,
  onGoToDataBalita,
}) => {
  const [activeTab, setActiveTab] = useState<OfficialVizTab>('all');

  if (!analytics) return null;

  const sec1 = analytics.section1_birth_weight;
  const sec2 = analytics.section2_age_cohort;
  const sec3 = analytics.section3_regional_spread;
  const sec4 = analytics.section4_posyandu_parenting;
  const sec5 = analytics.section5_maternal_factors;
  const timeSeries = analytics.time_series_trend;

  const hasAdditionalData =
    sec4.has_naik_bb || sec4.has_kelas_ibu || sec5.has_lila || sec5.has_panjang_lahir;

  const tabs = [
    { id: 'all' as OfficialVizTab, label: 'Semua 10 Visualisasi', icon: Layers, badge: '10 Grafik' },
    { id: 'kelahiran' as OfficialVizTab, label: 'A. Faktor Kelahiran', icon: Scale, badge: 'Viz 1-3' },
    { id: 'usia' as OfficialVizTab, label: 'B. Kelompok Usia', icon: Calendar, badge: 'Viz 4-5' },
    {
      id: 'wilayah' as OfficialVizTab,
      label: 'C. Sebaran Wilayah',
      icon: MapPin,
      badge: selectedDesa ? `Aktif: ${selectedDesa}` : 'Viz 6-8',
    },
    { id: 'tren' as OfficialVizTab, label: 'D. Hubungan & Tren', icon: TrendingUp, badge: 'Viz 9-10' },
    ...(hasAdditionalData
      ? [
          {
            id: 'tambahan' as OfficialVizTab,
            label: '+ Analisis Tambahan',
            icon: Users,
            badge: 'Variabel Khusus',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards Resmi Proyek Bagian 4.2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Prevalensi Stunting Keseluruhan */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Prevalensi Stunting
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600">
                {stuntingPercentage.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">
                ({stuntedCount.toLocaleString('id-ID')} balita)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Berdasarkan indikator baku WHO TB/U &lt; -2 SD
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Total Balita Tercatat */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Sampel Dianalisis
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {totalFiltered.toLocaleString('id-ID')}
              </span>
              {totalFiltered !== totalBalita && (
                <span className="text-xs text-slate-400">/ {totalBalita}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Balita tercatat pada dataset aktif
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Persentase BBLR */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Persentase BBLR
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">
                {sec1.bblr_rate_overall.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">
                ({sec1.bblr_count} kasus)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Berat lahir &lt; 2,5 kg dari data valid terisi
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Jumlah Wilayah Desa di Atas Rata-rata */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Desa di Atas Rata-Rata
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-700">
                {sec3.desas_above_avg_count}
              </span>
              <span className="text-xs text-slate-500">
                dari {sec3.total_desas_count} desa
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Desa dengan prevalensi &gt; {sec3.avg_desa_stunting_rate.toFixed(1)}%
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Banner Penanda Filter Desa Aktif (Cross-Filtering) */}
      {selectedDesa && (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-xs sm:text-sm">
              Cross-Filtering Aktif: <strong>Desa {selectedDesa}</strong>. Seluruh visualisasi menampilkan data spesifik desa ini.
            </span>
          </div>
          <button
            type="button"
            onClick={onResetDesa}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-teal-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tampilkan Semua Wilayah
          </button>
        </div>
      )}

      {/* Sub-Tab Navigasi 10 Visualisasi Utama */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                    isActive ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Konten Bagian Analisis Berdasarkan Tab Aktif */}
      {(activeTab === 'all' || activeTab === 'kelahiran') && (
        <BirthFactorsSection
          section1={sec1}
          section2={sec2}
          onGoToDataBalita={onGoToDataBalita}
        />
      )}

      {(activeTab === 'all' || activeTab === 'usia') && (
        <AgeCohortSection
          section2={sec2}
          onGoToDataBalita={onGoToDataBalita}
        />
      )}

      {(activeTab === 'all' || activeTab === 'wilayah') && (
        <RegionalSpreadSection
          section3={sec3}
          selectedDesa={selectedDesa}
          onSelectDesa={onSelectDesa}
          onGoToDataBalita={onGoToDataBalita}
        />
      )}

      {(activeTab === 'all' || activeTab === 'tren') && (
        <RelationshipTrendSection
          section4={sec4}
          timeSeries={timeSeries}
          onGoToDataBalita={onGoToDataBalita}
        />
      )}

      {(activeTab === 'all' || activeTab === 'tambahan') && hasAdditionalData && (
        <AdditionalAnalysisSection
          section4={sec4}
          section5={sec5}
          onGoToDataBalita={onGoToDataBalita}
        />
      )}
    </div>
  );
};
