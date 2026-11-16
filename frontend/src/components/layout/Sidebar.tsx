
import React from 'react';
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Database,
  LayoutDashboard,
  MapPinned,
  Menu,
  SearchCheck,
  TrendingUp,
  X,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';
import type { PageId } from '../../types/navigation';
import { navItems } from '../../types/navigation';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Database,
  BarChart3,
  SearchCheck,
  MapPinned,
  TrendingUp,
  BrainCircuit,
};

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  mobileOpen,
  onMobileClose,
}) => {
  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0">
      {/* Identitas aplikasi */}
      <div className="h-[68px] px-5 border-b border-slate-800 flex items-center shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>

          <div className="min-w-0">
            <h1 className="text-[16px] font-bold text-white leading-tight truncate">
              Stunting Toba
            </h1>

            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              Analytics & Risk Prediction
            </p>
          </div>
        </div>
      </div>

      {/* Tujuh menu fitur */}
      <nav
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        aria-label="Navigasi utama"
      >
        <p className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Menu Navigasi
        </p>

        {navItems.map((item) => {
          const Icon = iconMap[item.iconName] ?? LayoutDashboard;
          const active = item.id === activePage;

          return (
            <button
              key={item.id}
              type="button"
              title={item.description}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                onNavigate(item.id);
                onMobileClose();
              }}
              className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-lg
                text-[13px] font-medium transition-colors text-left
                ${
                  active
                    ? 'bg-teal-600/20 text-teal-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${
                  active ? 'text-teal-400' : 'text-slate-400'
                }`}
              />

              <span className="leading-snug">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Informasi singkat proyek */}
      <div className="mx-3 mb-4 p-3 rounded-xl bg-slate-800/70 border border-slate-700/50">
        <p className="text-[11px] font-semibold text-slate-200">
          Stunting Toba Analytics
        </p>

        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Analisis dataset balita Kabupaten Toba.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-[245px] shrink-0 bg-slate-900 text-slate-200 flex-col min-h-screen border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[275px] bg-slate-900 text-slate-200
          transition-transform duration-200 lg:hidden shadow-2xl
          ${
            mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }`}
        aria-label="Menu navigasi mobile"
        aria-hidden={!mobileOpen}
      >
        <div className="absolute top-3.5 right-3.5 z-10">
          <button
            type="button"
            onClick={onMobileClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            aria-label="Tutup menu navigasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sidebarContent}
      </aside>
    </>
  );
};

/**
 * Tombol untuk membuka sidebar pada mobile.
 * Tetap dipakai oleh Header.tsx lama.
 */
export const SidebarToggle: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
    aria-label="Buka menu navigasi"
  >
    <Menu className="w-5 h-5" />
  </button>
);
