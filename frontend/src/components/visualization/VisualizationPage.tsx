import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../dashboard/PageHeader';
import { VisualizationEmptyState } from './VisualizationEmptyState';
import { VisualizationFilterBar } from './VisualizationFilterBar';
import { VisualizationSummaryCards } from './VisualizationSummaryCards';
import { NutritionalStatusCharts } from './NutritionalStatusCharts';
import { CharacteristicsCharts } from './CharacteristicsCharts';
import { RegionalDistributionChart } from './RegionalDistributionChart';
import { ZScoreDistributionPanel } from './ZScoreDistributionPanel';
import { Official10Visualizations } from './Official10Visualizations';

import { fetchVisualizationData } from '../../services/api';
import type {
  VisualizationResponse,
  VisualizationFilterRequest,
} from '../../types/visualization';
import type { PageId } from '../../types/navigation';
import { Loader2, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck, Database, CheckCircle2, BarChart3, Layers } from 'lucide-react';

interface VisualizationPageProps {
  onNavigate: (page: PageId) => void;
}

export const VisualizationPage: React.FC<VisualizationPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<VisualizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDesa, setSelectedDesa] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tableau' | 'antropometri'>('tableau');

  const [currentFilter, setCurrentFilter] = useState<VisualizationFilterRequest>({
    kecamatan: null,
    puskesmas: null,
    desa_kelurahan: null,
    jenis_kelamin: null,
    age_group: null,
    status_stunting: null,
    region_type: 'puskesmas',
  });

  const loadData = useCallback(async (filterReq: VisualizationFilterRequest) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchVisualizationData(filterReq);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan tidak terduga saat memuat data visualisasi.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Inisialisasi awal saat halaman dibuka
  useEffect(() => {
    loadData(currentFilter);
  }, [loadData, currentFilter]);

  const handleFilterChange = (newFilter: VisualizationFilterRequest) => {
    setCurrentFilter(newFilter);
  };

  const handleRegionTypeChange = (regionType: 'kecamatan' | 'puskesmas' | 'desa_kelurahan') => {
    const updated = { ...currentFilter, region_type: regionType };
    setCurrentFilter(updated);
  };

  const handleDesaSelect = (desa: string) => {
    setSelectedDesa(desa);
    setCurrentFilter(prev => ({ ...prev, desa_kelurahan: desa }));
  };

  const handleDesaReset = () => {
    setSelectedDesa(null);
    setCurrentFilter(prev => ({ ...prev, desa_kelurahan: null }));
  };

  const stuntedCount = data?.status_tbu_distribution
    ? data.status_tbu_distribution
        .filter((d) => d.category.toLowerCase().includes('pendek'))
        .reduce((sum, d) => sum + d.count, 0)
    : 0;

  const totalTbuValid = data?.status_tbu_distribution
    ? data.status_tbu_distribution.reduce((sum, d) => sum + d.count, 0)
    : 0;

  const stuntingPercentage = totalTbuValid > 0 ? (stuntedCount / totalTbuValid) * 100 : 0;

  return (
    <div className="space-y-6 lg:space-y-7 animate-fadeIn w-full">
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Visualisasi Data Balita"
          description="Eksplorasi komprehensif indikator stunting (TB/U), wasting (BB/TB), underweight (BB/U), kohor usia, gender, dan sebaran wilayah balita Kabupaten Toba secara murni dinamis."
        />

        {data?.has_active_dataset && (
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => loadData(currentFilter)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-2xs hover:shadow-xs disabled:opacity-50"
              title="Segarkan data visualisasi"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
              Segarkan Data
            </button>

            <button
              type="button"
              onClick={() => onNavigate('data-balita')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white transition-all shadow-xs hover:shadow-md"
            >
              <Database className="w-3.5 h-3.5" />
              Kelola Dataset
            </button>
          </div>
        )}
      </div>

      {/* Error Banner jika pemanggilan gagal */}
      {errorMessage && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-4 text-[14px] shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-rose-900">Gagal Mengambil Data Visualisasi</h4>
            <p className="text-rose-700 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => loadData(currentFilter)}
            className="px-3.5 py-1.5 bg-white text-rose-700 rounded-lg border border-rose-200 font-semibold hover:bg-rose-50 text-[12px] shadow-2xs"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Dataset Warning (misal hasil filter kosong) */}
      {data?.warnings && data.warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 text-[13px] shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span className="flex-1 font-medium">{data.warnings.join(' • ')}</span>
        </div>
      )}

      {/* Loading Skeleton awal */}
      {isLoading && !data && (
        <div className="flex flex-col items-center justify-center p-20 space-y-4 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
          <p className="text-[16px] font-bold text-slate-800">Menghitung visualisasi statistik balita…</p>
          <p className="text-[14px] text-slate-500">Memproses distribusi antropometri, kelompok usia, dan wilayah</p>
        </div>
      )}

      {/* Kasus 1: Belum ada dataset aktif diunggah (Empty State) */}
      {data && !data.has_active_dataset && (
        <VisualizationEmptyState onGoToDataBalita={() => onNavigate('data-balita')} />
      )}

      {/* Kasus 2: Dataset aktif tersedia */}
      {data && data.has_active_dataset && (
        <div className="space-y-8 lg:space-y-10">
          {/* Metadata file aktif banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl text-[13px] sm:text-[14px] text-slate-600 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[12px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Dataset Aktif
              </span>
              <span className="font-bold text-slate-900 text-[14px]">{data.filename || 'dataset_balita'}</span>
              <span className="text-slate-400 font-mono text-[13px]">
                • Total {data.total_unfiltered_rows.toLocaleString('id-ID')} baris data
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('data-balita')}
              className="text-teal-700 hover:text-teal-800 font-bold inline-flex items-center gap-1.5 self-start sm:self-auto text-[13px] transition-colors"
            >
              Lihat Pemetaan Kolom
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Bar Interaktif */}
          <VisualizationFilterBar
            filterOptions={data.filter_options}
            currentFilter={currentFilter}
            onFilterChange={handleFilterChange}
            totalFiltered={data.total_filtered_rows}
            totalUnfiltered={data.total_unfiltered_rows}
            isLoading={isLoading}
          />

          {/* Navigasi Mode Visualisasi: 10 Visualisasi Advance (4.2) vs Standar Antropometri Baku */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('tableau')}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  viewMode === 'tableau'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <span>10 Visualisasi</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 ml-1">
                  10 Utama • 5 Advance
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('antropometri')}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  viewMode === 'antropometri'
                    ? 'bg-white text-slate-800 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Eksplorasi Antropometri Baku</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700 ml-1">
                  WHO Standar
                </span>
              </button>
            </div>
            <div className="px-3 text-[11px] text-slate-500 hidden md:block">
              {viewMode === 'tableau'
                ? 'Ketentuan Resmi 4.2: Box Plot, Treemap, Small Multiples, Heatmap, Deret Waktu'
                : 'Distribusi univariat status gizi baku TB/U, BB/U, BB/TB & Z-Score'}
            </div>
          </div>

          {/* Mode 1: Sepuluh Visualisasi Utama Resmi Proyek Bagian 4.2 */}
          {viewMode === 'tableau' && (
            <Official10Visualizations
              analytics={data.tableau_analytics}
              totalBalita={data.total_unfiltered_rows}
              totalFiltered={data.total_filtered_rows}
              stuntedCount={stuntedCount}
              stuntingPercentage={stuntingPercentage}
              selectedDesa={selectedDesa}
              onSelectDesa={handleDesaSelect}
              onResetDesa={handleDesaReset}
              onGoToDataBalita={() => onNavigate('data-balita')}
            />
          )}

          {/* Mode 2: Eksplorasi Antropometri Baku WHO (Fitur Asli Dipertahankan) */}
          {viewMode === 'antropometri' && (
            <div className="space-y-8">
              {data.summary && (
                <VisualizationSummaryCards
                  summary={data.summary}
                  totalUnfiltered={data.total_unfiltered_rows}
                />
              )}
              {/* Bagian 1: Distribusi Status Gizi (TB/U, BB/U, BB/TB) */}
              <NutritionalStatusCharts
                hasStatusTbu={data.has_status_tbu_column}
                statusTbuDistribution={data.status_tbu_distribution}
                statusTbuUnmappedReason={data.status_tbu_unmapped_reason}
                hasStatusBbu={data.has_status_bbu_column}
                statusBbuDistribution={data.status_bbu_distribution}
                statusBbuUnmappedReason={data.status_bbu_unmapped_reason}
                hasStatusBbtb={data.has_status_bbtb_column}
                statusBbtbDistribution={data.status_bbtb_distribution}
                statusBbtbUnmappedReason={data.status_bbtb_unmapped_reason}
              />

              {/* Bagian 2: Distribusi Karakteristik Demografi (Kelompok Usia & Gender) */}
              <CharacteristicsCharts
                hasAgeColumn={data.has_age_column}
                ageDistribution={data.age_group_distribution}
                ageUnmappedReason={data.age_unmapped_reason}
                hasGenderColumn={data.has_gender_column}
                genderDistribution={data.gender_distribution}
                genderUnmappedReason={data.gender_unmapped_reason}
              />

              {/* Bagian 3: Distribusi Wilayah (Horizontal Bar Chart) */}
              <RegionalDistributionChart
                availableRegionTypes={data.available_region_types}
                selectedRegionType={data.selected_region_type}
                onRegionTypeChange={handleRegionTypeChange}
                regionDistribution={data.region_distribution}
                regionUnmappedReason={data.region_unmapped_reason}
                hasStatusTbu={data.has_status_tbu_column}
                isLoading={isLoading}
              />

              {/* Bagian 4: Distribusi Numerik Z-Score (TB/U, BB/U, BB/TB) */}
              <ZScoreDistributionPanel
                zscoreTbu={data.zscore_tbu}
                zscoreBbu={data.zscore_bbu}
                zscoreBbtb={data.zscore_bbtb}
              />
            </div>
          )}

          {/* Catatan Integritas Data & Standar Analisis */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 lg:p-7 space-y-3 text-[14px] text-slate-600 shadow-xs">
            <div className="flex items-center gap-2.5 text-slate-800 font-bold text-[16px]">
              <ShieldCheck className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <span>Ketentuan Integritas Data & Standar Analisis Stunting Toba</span>
            </div>
            <ul className="list-disc list-inside space-y-2 text-[13px] lg:text-[14px] text-slate-500 pl-1 leading-relaxed">
              <li>
                <strong className="text-slate-700">Pembedaan Tiga Indikator Baku:</strong> TB/U (stunting), BB/U (underweight), dan BB/TB (wasting) dihitung secara terpisah sesuai standar antropometri WHO/Kemenkes RI. Kesimpulan diagnosis stunting hanya mengacu pada indikator TB/U.
              </li>
              <li>
                <strong className="text-slate-700">Data Murni Dinamis:</strong> Seluruh grafik dan persentase dihitung langsung dari berkas aktif yang diunggah tanpa data sintetis atau tiruan saat dataset tersedia.
              </li>
              <li>
                <strong className="text-slate-700">Privasi & Perlindungan PII:</strong> Data identitas pribadi seperti NIK, Nama Lengkap, Alamat, dan Nomor HP telah diproteksi dan tidak diekspos dalam agregasi visualisasi ini.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
