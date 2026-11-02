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
import { DataBalitaPage } from './components/data-balita/DataBalitaPage';

import { checkBackendHealth } from './services/api';
import type { HealthCheckResult } from './types/health';
import type { PageId } from './types/navigation';
import { navItems } from './types/navigation';
import {
  statCards,
  monthlyTrend,
  riskFactors,
  childPreviewData,
} from './data/dashboard';

export function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

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

  useEffect(() => {
    fetchHealth();
    // Auto-check connectivity every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const currentNav = navItems.find((item) => item.id === activePage) ?? navItems[0];

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

        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activePage === 'dashboard' ? (
            <>
              {/* Heading Halaman */}
              <PageHeader
                title="Dashboard"
                description="Pemantauan ringkasan dan analisis faktor risiko stunting di Kabupaten Toba."
              />

              {/* Baris Kartu Ringkasan (4 Kartu) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {statCards.map((stat) => (
                  <StatCard key={stat.label} data={stat} />
                ))}
              </div>

              {/* Area Visualisasi (2 Panel Seimbang) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChartPanel
                  title="Tren Distribusi Data Bulanan"
                  description="Jumlah data balita tercatat vs valid per bulan (data contoh)"
                >
                  <TrendChart data={monthlyTrend} />
                </ChartPanel>

                <ChartPanel
                  title="Komposisi Faktor Risiko Teridentifikasi"
                  description="Frekuensi kemunculan faktor risiko pada data contoh"
                >
                  <RiskBarChart data={riskFactors} />
                </ChartPanel>
              </div>

              {/* Area Tabel Preview Data Balita */}
              <DataTable data={childPreviewData} />

              {/* Informasi Status & Keterangan Data */}
              <DataDisclaimer />

              {/* Status Koneksi Backend API */}
              <HealthStatusCard
                healthResult={healthResult}
                onRefresh={fetchHealth}
                isLoading={isLoading}
              />
            </>
          ) : activePage === 'data-balita' ? (
            <DataBalitaPage />
          ) : (
            <PlaceholderView
              item={currentNav}
              onBackToDashboard={() => setActivePage('dashboard')}
            />
          )}
        </main>

        {/* Footer Aplikasi */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 sm:px-8 text-center text-xs text-slate-500">
          <p>
            Stunting Toba • Inisiatif Analisis Faktor Risiko Stunting Kabupaten Toba • Tahap 2: UI Dashboard Profesional
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Menggunakan data sintetis/contoh untuk pengujian antarmuka dan perancangan sistem.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
