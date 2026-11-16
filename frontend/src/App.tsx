
import { useState, useEffect, useCallback } from 'react';

// ======================================================
// 1. DASHBOARD
// ======================================================

import { DashboardStage3Page } from './components/dashboard/DashboardStage3Page';
import { PageHeader } from './components/dashboard/PageHeader';
import { ActiveDatasetBanner } from './components/dashboard/ActiveDatasetBanner';
import { DashboardEmptyState } from './components/dashboard/DashboardEmptyState';
import { DashboardLoadingSkeleton } from './components/dashboard/DashboardLoadingSkeleton';
import { DashboardErrorState } from './components/dashboard/DashboardErrorState';

// ======================================================
// 2. LAYOUT
// ======================================================

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// ======================================================
// 3. HALAMAN APLIKASI
// ======================================================

import { DataBalitaPage } from './components/data-balita/DataBalitaPage';

import { VisualizationPage } from './components/visualization/VisualizationPage';

import { RiskFactorPage } from './components/modules/RiskFactorPage';

import {
  RegionComparisonPage,
  StuntingTrendPage,
} from './components/modules/Stage5Pages';

import { MachineLearningPage } from './components/modules/MachineLearningPage';

// ======================================================
// 4. SERVICES
// ======================================================

import {
  checkBackendHealth,
  fetchDashboardSummary,
} from './services/api';

// ======================================================
// 5. TYPES
// ======================================================

import type { HealthCheckResult } from './types/health';
import type { DashboardSummaryResponse } from './types/dashboard';
import type { PageId } from './types/navigation';

import {
  navItems,
  pageFromHash,
  hashFromPage,
} from './types/navigation';

// ======================================================
// 6. KOMPONEN UTAMA
// ======================================================

export function App() {

  // ----------------------------------------------------
  // STATE NAVIGASI
  // ----------------------------------------------------

  const [activePage, setActivePage] = useState<PageId>(
    () => pageFromHash(window.location.hash)
  );

  const [mobileOpen, setMobileOpen] = useState<boolean>(
    false
  );

  // ----------------------------------------------------
  // STATE DASHBOARD
  // ----------------------------------------------------

  const [dashboardData, setDashboardData] =
    useState<DashboardSummaryResponse | null>(null);

  const [isDashboardLoading, setIsDashboardLoading] =
    useState<boolean>(false);

  const [dashboardError, setDashboardError] =
    useState<string | null>(null);

  // ----------------------------------------------------
  // STATE BACKEND
  // ----------------------------------------------------

  const [healthResult, setHealthResult] =
    useState<HealthCheckResult>({
      status: 'checking',
      checkedAt: new Date(),
    });

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  // ====================================================
  // 7. NAVIGASI HALAMAN
  // ====================================================

  const navigate = useCallback((page: PageId) => {

    setActivePage(page);
    setMobileOpen(false);

    const targetHash = hashFromPage(page);

    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }

    window.scrollTo({
      top: 0,
      behavior: 'auto',
    });

  }, []);

  // ====================================================
  // 8. MENDUKUNG BACK DAN FORWARD BROWSER
  // ====================================================

  useEffect(() => {

    if (!window.location.hash) {
      window.history.replaceState(
        null,
        '',
        hashFromPage('dashboard')
      );
    }

    const handleHashChange = () => {
      setActivePage(
        pageFromHash(window.location.hash)
      );

      setMobileOpen(false);
    };

    window.addEventListener(
      'hashchange',
      handleHashChange
    );

    return () => {
      window.removeEventListener(
        'hashchange',
        handleHashChange
      );
    };

  }, []);

  // ====================================================
  // 9. MEMERIKSA KONEKSI BACKEND
  // ====================================================

  const fetchHealth = useCallback(async () => {

    setIsLoading(true);

    try {

      const result = await checkBackendHealth();

      setHealthResult(result);

    } catch (error: unknown) {

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

  // Cek koneksi backend secara berkala.
  useEffect(() => {

    void fetchHealth();

    const interval = window.setInterval(() => {
      void fetchHealth();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };

  }, [fetchHealth]);

  // ====================================================
  // 10. MEMUAT RINGKASAN DASHBOARD
  // ====================================================

  const loadDashboard = useCallback(async () => {

    setIsDashboardLoading(true);
    setDashboardError(null);

    try {

      const data = await fetchDashboardSummary();

      setDashboardData(data);

    } catch (error: unknown) {

      console.warn(
        'Gagal memuat ringkasan dashboard:',
        error
      );

      setDashboardError(
        error instanceof Error
          ? error.message
          : 'Gagal menghubungi server backend'
      );

      setDashboardData(null);

    } finally {
      setIsDashboardLoading(false);
    }

  }, []);

  // Sinkronkan metadata dataset saat berpindah menu.
  useEffect(() => {

    if (activePage !== 'data-balita') {
      void loadDashboard();
    }

  }, [activePage, loadDashboard]);

  // ====================================================
  // 11. INFORMASI MENU AKTIF
  // ====================================================

  const currentNav =
    navItems.find(
      (item) => item.id === activePage
    ) ?? navItems[0];

  // ====================================================
  // 12. TAMPILAN APLIKASI
  // ====================================================

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 antialiased">

      {/* ============================================ */}
      {/* SIDEBAR */}
      {/* ============================================ */}

      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* ============================================ */}
      {/* AREA KANAN */}
      {/* ============================================ */}

      <div className="flex-1 flex flex-col min-w-0">

        {/* HEADER */}

        <Header
          pageTitle={currentNav.label}
          pageDescription={currentNav.description}
          onSidebarToggle={() => {
            setMobileOpen((previous) => !previous);
          }}
          connectionStatus={healthResult.status}
          onRefreshHealth={fetchHealth}
          isHealthLoading={isLoading}
        />

        {/* ========================================== */}
        {/* KONTEN HALAMAN */}
        {/* ========================================== */}

        <main className="flex-1 p-5 sm:p-7 lg:p-8 xl:px-10 max-w-[1680px] 2xl:max-w-[1800px] w-full mx-auto space-y-6 sm:space-y-7">

          {/* ======================================== */}
          {/* HALAMAN 1: DASHBOARD UTAMA */}
          {/* ======================================== */}

          {activePage === 'dashboard' ? (

            isDashboardLoading && !dashboardData ? (

              <DashboardLoadingSkeleton />

            ) : dashboardError && !dashboardData ? (

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

              <>
                <PageHeader
                  title="Dashboard Utama"
                  description="Ringkasan pemantauan data balita dan status gizi Kabupaten Toba."
                  onRefresh={loadDashboard}
                  isRefreshing={isDashboardLoading}
                  connectionStatus={healthResult.status}
                  latencyMs={healthResult.latencyMs}
                />

                <ActiveDatasetBanner
                  filename={
                    dashboardData.filename ||
                    'Dataset Aktif'
                  }
                  totalRecords={
                    dashboardData.total_records
                  }
                  validRecords={
                    dashboardData.valid_records
                  }
                  validPercentage={
                    dashboardData.valid_percentage
                  }
                  updatedAt={
                    dashboardData.updated_at
                  }
                  readinessStatus={
                    dashboardData.readiness_status
                  }
                  onGoToDataBalita={() =>
                    navigate('data-balita')
                  }
                  onGoToVisualization={() =>
                    navigate('visualisasi')
                  }
                  onRefresh={loadDashboard}
                  isLoading={isDashboardLoading}
                />

                <DashboardStage3Page />
              </>

            ) : (

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
                  onGoToDataBalita={() =>
                    navigate('data-balita')
                  }
                />
              </>

            )

          ) : activePage === 'data-balita' ? (

            /* ====================================== */
            /* HALAMAN 2: MANAJEMEN DATA & ETL */
            /* ====================================== */

            <DataBalitaPage
              onNavigateToVisualisasi={() =>
                navigate('visualisasi')
              }
            />

          ) : activePage === 'visualisasi' ? (

            /* ====================================== */
            /* HALAMAN 3: VISUALISASI INTERAKTIF */
            /* ====================================== */

            <VisualizationPage
              onNavigate={navigate}
            />

          ) : activePage === 'analisis' ? (

            /* ====================================== */
            /* HALAMAN 4: ANALISIS FAKTOR RISIKO */
            /* ====================================== */

            <RiskFactorPage />

          ) : activePage === 'wilayah' ? (

            /* ====================================== */
            /* HALAMAN 5: PERBANDINGAN WILAYAH */
            /* ====================================== */

            <RegionComparisonPage />

          ) : activePage === 'tren' ? (

            /* ====================================== */
            /* HALAMAN 6: TREN STUNTING */
            /* ====================================== */

            <StuntingTrendPage />

          ) : (

            /* ====================================== */
            /* HALAMAN 7: KLASIFIKASI MACHINE LEARNING */
            /* ====================================== */

            <MachineLearningPage />

          )}

        </main>

        {/* ========================================== */}
        {/* FOOTER */}
        {/* ========================================== */}

        <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 sm:px-8 text-center text-[12px] text-slate-500">

          <p>
            Stunting Toba • Inisiatif Analisis Faktor Risiko
            Stunting Kabupaten Toba
          </p>

          <p className="mt-0.5 text-[11px] text-slate-400">

            {dashboardData?.has_active_dataset

              ? `Terhubung dengan dataset aktif: ${dashboardData.filename} (${dashboardData.total_records.toLocaleString('id-ID')} catatan)`

              : 'Belum ada dataset aktif yang terhubung. Silakan unggah berkas melalui menu Manajemen Data & ETL.'
            }

          </p>

        </footer>

      </div>
    </div>
  );
}

export default App;
