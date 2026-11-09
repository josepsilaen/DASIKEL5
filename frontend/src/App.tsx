import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { PlaceholderView } from './components/layout/PlaceholderView';
import { PageHeader } from './components/dashboard/PageHeader';
import { StatCard } from './components/dashboard/StatCard';
import { ChartPanel } from './components/dashboard/ChartPanel';
import { TrendChart } from './components/dashboard/TrendChart';
import { RiskBarChart } from './components/dashboard/RiskBarChart';
import { DataTable } from './components/dashboard/DataTable';
import { DataDisclaimer } from './components/dashboard/DataDisclaimer';
import { HealthStatusCard } from './components/dashboard/HealthStatusCard';
import { DashboardEmptyState } from './components/dashboard/DashboardEmptyState';
import { DashboardNoticeBanner } from './components/dashboard/DashboardNoticeBanner';
import { ActiveDatasetBanner } from './components/dashboard/ActiveDatasetBanner';
import { DashboardNutritionBarChart } from './components/dashboard/DashboardNutritionBarChart';
import { RiskFactorsPendingCard } from './components/dashboard/RiskFactorsPendingCard';
import { DateTrendPendingCard } from './components/dashboard/DateTrendPendingCard';
import { DataBalitaPage } from './components/data-balita/DataBalitaPage';
import { VisualizationPage } from './components/visualization/VisualizationPage';

import { checkBackendHealth, fetchDashboardSummary } from './services/api';
import type { HealthCheckResult } from './types/health';
import type { PageId } from './types/navigation';
import { navItems } from './types/navigation';
import type { DashboardSummaryResponse } from './types/dashboard';
import {
  statCards,
  monthlyTrend,
  riskFactors,
  childPreviewData,
} from './data/dashboard';

export function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [showSyntheticPreview, setShowSyntheticPreview] = useState<boolean>(true);

  const [dashboardData, setDashboardData] = useState<DashboardSummaryResponse | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState<boolean>(false);

  const [healthResult, setHealthResult] = useState<HealthCheckResult>({
    status: 'checking',
    checkedAt: new Date(),
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await checkBackendHealth();
      setHealthResult(result);
    } catch (error) {
      setHealthResult({
        status: 'disconnected',
        error:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan tidak terduga',
        checkedAt: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setIsDashboardLoading(true);
    try {
      const data = await fetchDashboardSummary();
      setDashboardData(data);
    } catch (err) {
      console.warn('Gagal memuat ringkasan dashboard aktif:', err);
      setDashboardData(null);
    } finally {
      setIsDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Auto-check connectivity every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  useEffect(() => {
    if (activePage === 'dashboard') {
      loadDashboard();
    }
  }, [activePage, loadDashboard]);

  const currentNav = navItems.find((item) => item.id === activePage) ?? navItems[0];

  // Susun data kartu statistik dinamis dari dataset aktif
  const dynamicStatCards = dashboardData && dashboardData.has_active_dataset
    ? [
        {
          label: 'Total Catatan Balita',
          value: dashboardData.total_records,
          unit: 'catatan',
          description: 'Jumlah baris data balita tercatat pada berkas aktif (bukan balita unik)',
          isSynthetic: false,
        },
        {
          label: 'Data Valid',
          value: dashboardData.valid_records,
          unit: 'entri',
          description: 'Catatan yang memenuhi kelengkapan atribut valid',
          trend: { value: dashboardData.valid_percentage, direction: 'up' as const },
          isSynthetic: false,
        },
        {
          label: 'Perlu Diperiksa',
          value: dashboardData.need_check_records,
          unit: 'entri',
          description: 'Catatan dengan data kosong atau memerlukan verifikasi kualitas',
          trend: { value: dashboardData.need_check_percentage, direction: 'down' as const },
          isSynthetic: false,
        },
        ...(dashboardData.has_status_tbu
          ? [
              {
                label: 'Balita Stunting (TB/U)',
                value: dashboardData.stunted_count,
                unit: 'balita',
                description: `Terindikasi Pendek & Sangat Pendek (${dashboardData.stunted_percentage.toFixed(1)}% dari data TB/U valid)`,
                trend: { value: dashboardData.stunted_percentage, direction: 'neutral' as const },
                isSynthetic: false,
              },
            ]
          : []),
        {
          label: 'Cakupan Wilayah',
          value:
            dashboardData.has_region
              ? dashboardData.total_kecamatan > 0
                ? dashboardData.total_kecamatan
                : dashboardData.total_puskesmas
              : 'Belum Ada',
          unit:
            dashboardData.has_region
              ? dashboardData.total_kecamatan > 0
                ? 'kecamatan'
                : 'puskesmas'
              : '',
          description: dashboardData.has_region
            ? `${dashboardData.total_kecamatan} kecamatan, ${dashboardData.total_puskesmas} puskesmas, ${dashboardData.total_desa} desa tercakup`
            : 'Kolom wilayah belum dipetakan pada dataset aktif',
          isSynthetic: false,
        },
      ]
    : [];

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 antialiased">
      {/* Sidebar Navigasi Kiri */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        connectionStatus={healthResult.status}
        latencyMs={healthResult.latencyMs}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Konten Utama Kanan */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          pageTitle={currentNav.label}
          pageDescription={currentNav.description}
          onSidebarToggle={() => setMobileOpen((prev) => !prev)}
          connectionStatus={healthResult.status}
          onRefreshHealth={fetchHealth}
          isHealthLoading={isLoading}
        />

        <main className="flex-1 p-5 sm:p-7 lg:p-8 xl:px-10 max-w-[1680px] 2xl:max-w-[1800px] w-full mx-auto space-y-6 sm:space-y-7">
          {activePage === 'dashboard' ? (
            dashboardData?.has_active_dataset ? (
              /* ================= MODE DASHBOARD DINAMIS DENGAN DATASET AKTIF ================= */
              <>
                {/* Heading Halaman */}
                <PageHeader
                  title="Dashboard Utama"
                  description="Pemantauan ringkasan indikator antropometri dan analisis data balita Kabupaten Toba."
                />

                {/* Banner Status Dataset Aktif Terverifikasi */}
                <ActiveDatasetBanner
                  filename={dashboardData.filename || 'Dataset Aktif'}
                  totalRecords={dashboardData.total_records}
                  validRecords={dashboardData.valid_records}
                  validPercentage={dashboardData.valid_percentage}
                  readinessStatus={dashboardData.readiness_status}
                  onGoToDataBalita={() => setActivePage('data-balita')}
                  onGoToVisualization={() => setActivePage('visualisasi')}
                  onRefresh={loadDashboard}
                  isLoading={isDashboardLoading}
                />

                {/* Baris Kartu Ringkasan Dinamis (4 atau 5 Kartu Aktual) */}
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 ${
                    dynamicStatCards.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
                  } gap-4 sm:gap-5`}
                >
                  {dynamicStatCards.map((stat) => (
                    <StatCard key={stat.label} data={stat} isSynthetic={false} />
                  ))}
                </div>

                {/* Area Visualisasi Dinamis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                  {/* Panel Kiri: Tren Distribusi Pengukuran Bulanan */}
                  {dashboardData.has_date_trend ? (
                    <ChartPanel
                      title="Tren Distribusi Data Bulanan"
                      description="Jumlah data balita tercatat vs valid per bulan pengukuran"
                      badge="Data Aktual"
                      isSynthetic={false}
                      footerNote={`* Berdasarkan tanggal pengukuran aktual pada berkas ${dashboardData.filename}`}
                    >
                      <TrendChart data={dashboardData.monthly_trend} />
                    </ChartPanel>
                  ) : (
                    <ChartPanel
                      title="Tren Distribusi Data Bulanan"
                      description="Jumlah data balita tercatat vs valid per bulan pengukuran"
                      badge="Belum Dipetakan"
                      isSynthetic={false}
                      footerNote="* Memerlukan pemetaan kolom tanggal pengukuran pada dataset aktif"
                    >
                      <DateTrendPendingCard
                        unmappedReason={dashboardData.date_trend_unmapped_reason}
                        onGoToDataBalita={() => setActivePage('data-balita')}
                      />
                    </ChartPanel>
                  )}

                  {/* Panel Kanan: Status Stunting TB/U atau Determinan Faktor Risiko */}
                  {dashboardData.has_status_tbu ? (
                    <ChartPanel
                      title="Distribusi Status Antropometri (TB/U)"
                      description="Proporsi kategori tinggi badan menurut usia balita"
                      badge="Data Aktual"
                      isSynthetic={false}
                      footerNote={`* Dihitung dari ${dashboardData.valid_records.toLocaleString('id-ID')} catatan valid pada ${dashboardData.filename}`}
                    >
                      <DashboardNutritionBarChart data={dashboardData.tbu_distribution} />
                    </ChartPanel>
                  ) : dashboardData.has_risk_factors ? (
                    <ChartPanel
                      title="Komposisi Faktor Risiko Teridentifikasi"
                      description="Frekuensi kemunculan faktor determinan pada dataset aktif"
                      badge="Data Aktual"
                      isSynthetic={false}
                    >
                      <RiskBarChart data={dashboardData.risk_factors} />
                    </ChartPanel>
                  ) : (
                    <ChartPanel
                      title="Analisis Faktor Risiko Determinan"
                      description="Frekuensi kemunculan faktor determinan stunting"
                      badge="Menunggu Skema"
                      isSynthetic={false}
                      footerNote="* Analisis faktor risiko menunggu penetapan skema final Dinas Kesehatan Toba"
                    >
                      <RiskFactorsPendingCard
                        unmappedReason={dashboardData.risk_factors_unmapped_reason}
                        onGoToDataBalita={() => setActivePage('data-balita')}
                      />
                    </ChartPanel>
                  )}
                </div>

                {/* Area Tabel Preview Data Balita Riil (Tersamar) */}
                <DataTable
                  data={dashboardData.preview_rows}
                  isSynthetic={false}
                  totalRecords={dashboardData.total_records}
                  filename={dashboardData.filename}
                />

                {/* Keterangan Integritas Data Aktual */}
                <DataDisclaimer
                  isSynthetic={false}
                  filename={dashboardData.filename}
                  totalRecords={dashboardData.total_records}
                />

                {/* Status Koneksi Backend API */}
                <HealthStatusCard
                  healthResult={healthResult}
                  onRefresh={fetchHealth}
                  isLoading={isLoading}
                />
              </>
            ) : !showSyntheticPreview ? (
              /* ================= MODE KOSONG TANPA DATASET AKTIF ================= */
              <>
                {/* Heading Halaman */}
                <PageHeader
                  title="Dashboard Utama"
                  description="Pemantauan ringkasan dan analisis faktor risiko stunting di Kabupaten Toba."
                />

                {/* Tampilan Empty State Profesional ketika dataset aktif belum tersedia */}
                <DashboardEmptyState
                  onGoToDataBalita={() => setActivePage('data-balita')}
                  onToggleSyntheticPreview={() => setShowSyntheticPreview(true)}
                  showSyntheticPreview={false}
                />

                {/* Status Koneksi Backend API */}
                <HealthStatusCard
                  healthResult={healthResult}
                  onRefresh={fetchHealth}
                  isLoading={isLoading}
                />
              </>
            ) : (
              /* ================= MODE PRATINJAU DESAIN (DATA CONTOH) ================= */
              <>
                {/* Heading Halaman */}
                <PageHeader
                  title="Dashboard Utama"
                  description="Pemantauan ringkasan dan analisis faktor risiko stunting di Kabupaten Toba (Mode Pratinjau Desain)."
                />

                {/* Banner Status Data Sintetis & Keterangan Dataset Puskesmas */}
                <DashboardNoticeBanner
                  onGoToDataBalita={() => setActivePage('data-balita')}
                  onHideSyntheticPreview={() => setShowSyntheticPreview(false)}
                />

                {/* Baris Kartu Ringkasan (4 Kartu) dengan Penanda Data Contoh */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {statCards.map((stat) => (
                    <StatCard key={stat.label} data={stat} isSynthetic={true} />
                  ))}
                </div>

                {/* Area Visualisasi dengan Penanda Ilustrasi & Catatan Kaki */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                  <ChartPanel
                    title="Tren Distribusi Data Bulanan"
                    description="Jumlah data balita tercatat vs valid per bulan (ilustrasi pengujian antarmuka)"
                    badge="Data Contoh"
                    isSynthetic={true}
                    footerNote="* Ilustrasi pengembangan aplikasi — bukan data penelitian Kabupaten Toba"
                  >
                    <TrendChart data={monthlyTrend} />
                  </ChartPanel>

                  <ChartPanel
                    title="Komposisi Faktor Risiko Teridentifikasi"
                    description="Frekuensi kemunculan faktor risiko pada data contoh (ilustrasi desain)"
                    badge="Data Contoh"
                    isSynthetic={true}
                    footerNote="* Ilustrasi faktor risiko prototype — belum menggunakan data riil Puskesmas"
                  >
                    <RiskBarChart data={riskFactors} />
                  </ChartPanel>
                </div>

                {/* Area Tabel Preview Data Balita Contoh */}
                <DataTable
                  data={childPreviewData}
                  isSynthetic={true}
                  totalRecords={childPreviewData.length}
                />

                {/* Informasi Status & Keterangan Data Contoh */}
                <DataDisclaimer isSynthetic={true} />

                {/* Status Koneksi Backend API */}
                <HealthStatusCard
                  healthResult={healthResult}
                  onRefresh={fetchHealth}
                  isLoading={isLoading}
                />
              </>
            )
          ) : activePage === 'data-balita' ? (
            <DataBalitaPage onNavigateToVisualisasi={() => setActivePage('visualisasi')} />
          ) : activePage === 'visualisasi' ? (
            <VisualizationPage onNavigate={setActivePage} />
          ) : (
            <PlaceholderView
              item={currentNav}
              onBackToDashboard={() => setActivePage('dashboard')}
            />
          )}
        </main>

        {/* Footer Aplikasi */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 sm:px-8 text-center text-[12px] text-slate-500">
          <p>
            Stunting Toba • Inisiatif Analisis Faktor Risiko Stunting Kabupaten Toba • Tahap 2: UI Dashboard Profesional
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {dashboardData?.has_active_dataset
              ? `Terhubung dengan dataset aktif: ${dashboardData.filename} (${dashboardData.total_records.toLocaleString('id-ID')} catatan)`
              : 'Menggunakan data sintetis/contoh untuk pengujian antarmuka dan perancangan sistem.'}
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
