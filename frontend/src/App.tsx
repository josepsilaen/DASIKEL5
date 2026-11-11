import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { PlaceholderView } from './components/layout/PlaceholderView';
import { PageHeader } from './components/dashboard/PageHeader';
import { ActiveDatasetBanner } from './components/dashboard/ActiveDatasetBanner';
import { StatCard } from './components/dashboard/StatCard';
import { DashboardEmptyState } from './components/dashboard/DashboardEmptyState';
import { DashboardLoadingSkeleton } from './components/dashboard/DashboardLoadingSkeleton';
import { DashboardErrorState } from './components/dashboard/DashboardErrorState';
import { BirthWeightDashboardPage } from './components/dashboard/BirthWeightDashboardPage';
import { DataBalitaPage } from './components/data-balita/DataBalitaPage';
import { VisualizationPage } from './components/visualization/VisualizationPage';

import { checkBackendHealth, fetchDashboardSummary } from './services/api';
import type { HealthCheckResult } from './types/health';
import type { PageId } from './types/navigation';
import { navItems } from './types/navigation';
import type { DashboardSummaryResponse } from './types/dashboard';

export function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const [dashboardData, setDashboardData] = useState<DashboardSummaryResponse | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

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
    setDashboardError(null);
    try {
      const data = await fetchDashboardSummary();
      setDashboardData(data);
    } catch (err) {
      console.warn('Gagal memuat ringkasan dashboard aktif:', err);
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi server backend';
      setDashboardError(msg);
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

  // Susun 4 kartu statistik utama sesuai arsitektur Stunting Toba
  const dynamicStatCards = dashboardData && dashboardData.has_active_dataset
    ? [
        {
          label: 'Total Catatan Balita',
          value: dashboardData.total_records,
          unit: 'catatan',
          description: 'Jumlah baris data balita tercatat pada berkas aktif (bukan balita unik)',
          indicatorBadge: dashboardData.has_status_tbu
            ? {
                text: `${dashboardData.stunted_count} Stunting (${dashboardData.stunted_percentage.toFixed(1)}%)`,
                variant: 'amber' as const,
              }
            : undefined,
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
            /* ================= EVALUASI KONDISI DASHBOARD ================= */
            isDashboardLoading && !dashboardData ? (
              /* Kondisi 3: API sedang memuat data pertama kali */
              <DashboardLoadingSkeleton />
            ) : dashboardError && !dashboardData ? (
              /* Kondisi 4: API gagal diakses */
              <>
                <PageHeader
                  title="Dashboard Utama"
                  description="Ringkasan pemantauan data balita dan status gizi Kabupaten Toba."
                  onRefresh={loadDashboard}
                  isRefreshing={isDashboardLoading}
                  connectionStatus={healthResult.status}
                  latencyMs={healthResult.latencyMs}
                />
                <DashboardErrorState
                  errorMessage={dashboardError}
                  onRetry={loadDashboard}
                  isRetrying={isDashboardLoading}
                />
              </>
            ) : dashboardData?.has_active_dataset ? (
              /* Kondisi 2: Dataset aktif tersedia */
              <>
                {/* 1. Header Dashboard */}
                <PageHeader
                  title="Dashboard Utama"
                  description="Ringkasan pemantauan data balita dan status gizi Kabupaten Toba."
                  onRefresh={loadDashboard}
                  isRefreshing={isDashboardLoading}
                  connectionStatus={healthResult.status}
                  latencyMs={healthResult.latencyMs}
                />

                {/* 2. Informasi Dataset Aktif */}
                <ActiveDatasetBanner
                  filename={dashboardData.filename || 'Dataset Aktif'}
                  totalRecords={dashboardData.total_records}
                  validRecords={dashboardData.valid_records}
                  validPercentage={dashboardData.valid_percentage}
                  updatedAt={dashboardData.updated_at}
                  readinessStatus={dashboardData.readiness_status}
                  onGoToDataBalita={() => setActivePage('data-balita')}
                  onGoToVisualization={() => setActivePage('visualisasi')}
                  onRefresh={loadDashboard}
                  isLoading={isDashboardLoading}
                />

                {/* 3. Empat Kartu Statistik Utama */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {dynamicStatCards.map((stat) => (
                    <StatCard key={stat.label} data={stat} isSynthetic={false} />
                  ))}
                </div>

                {/* 4. Analisis Pengaruh Berat Lahir terhadap Risiko Stunting */}
                <BirthWeightDashboardPage
                  dashboardData={dashboardData}
                  onGoToDataBalita={() => setActivePage('data-balita')}
                />
              </>
            ) : (
              /* Kondisi 1: Belum ada dataset aktif (Empty State Profesional) */
              <>
                <PageHeader
                  title="Dashboard Utama"
                  description="Ringkasan pemantauan data balita dan status gizi Kabupaten Toba."
                  onRefresh={loadDashboard}
                  isRefreshing={isDashboardLoading}
                  connectionStatus={healthResult.status}
                  latencyMs={healthResult.latencyMs}
                />

                <DashboardEmptyState
                  onGoToDataBalita={() => setActivePage('data-balita')}
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
            Stunting Toba • Inisiatif Analisis Faktor Risiko Stunting Kabupaten Toba
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {dashboardData?.has_active_dataset
              ? `Terhubung dengan dataset aktif: ${dashboardData.filename} (${dashboardData.total_records.toLocaleString('id-ID')} catatan)`
              : 'Belum ada dataset aktif yang terhubung. Silakan unggah berkas melalui menu Data Balita.'}
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
