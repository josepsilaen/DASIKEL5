import React from 'react';
import {
  LayoutDashboard,
  Users,
  SearchCheck,
  BarChart3,
  Settings,
  Activity,
  Server,
  Menu,
  X,
} from 'lucide-react';
import type { NavItem, PageId } from '../../types/navigation';
import type { ConnectionStatus } from '../../types/health';
import { navItems } from '../../types/navigation';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  SearchCheck,
  BarChart3,
  Settings,
};

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  connectionStatus: ConnectionStatus;
  latencyMs?: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  connectionStatus,
  latencyMs,
  mobileOpen,
  onMobileClose,
}) => {
  const handleNav = (item: NavItem) => {
    if (item.available) {
      onNavigate(item.id);
      onMobileClose();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-[68px] px-5 border-b border-slate-800 flex items-center flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-teal-900/40">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[16px] font-bold text-white leading-tight truncate tracking-tight">
              Stunting Toba
            </h1>
            <p className="text-[11.5px] text-slate-400 leading-tight mt-0.5 truncate font-normal">
              Risk Analysis Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Menu Navigasi
        </p>
        {navItems.map((item) => {
          const Icon = iconMap[item.iconName] ?? LayoutDashboard;
          const isActive = item.id === activePage;
          const isDisabled = !item.available;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item)}
              disabled={isDisabled}
              title={isDisabled ? `${item.label} — belum tersedia` : item.description}
              className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors text-left
                ${
                  isActive
                    ? 'bg-teal-600/20 text-teal-300 font-semibold shadow-2xs'
                    : isDisabled
                    ? 'text-slate-500 cursor-not-allowed opacity-60'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }
              `}
            >
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 ${
                  isActive ? 'text-teal-400' : isDisabled ? 'text-slate-500' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
              {isDisabled && (
                <span className="ml-auto text-[10.5px] bg-slate-800 text-slate-400 border border-slate-700/60 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                  Segera
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Backend status widget */}
      <div className="mx-3 mb-4 p-3 rounded-xl bg-slate-800/70 border border-slate-700/50">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[12px] font-semibold text-slate-200">
              Backend API
            </span>
          </div>
          <span className="relative flex h-2 w-2">
            {connectionStatus === 'connected' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500'
                  : connectionStatus === 'checking'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
          </span>
        </div>
        <div className="flex items-center justify-between text-[11.5px] text-slate-400">
          <span>Status</span>
          <span
            className={`font-semibold ${
              connectionStatus === 'connected'
                ? 'text-emerald-400'
                : connectionStatus === 'checking'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {connectionStatus === 'connected'
              ? 'Terhubung'
              : connectionStatus === 'checking'
              ? 'Memeriksa…'
              : 'Terputus'}
          </span>
        </div>
        {connectionStatus === 'connected' && latencyMs !== undefined && (
          <div className="flex items-center justify-between text-[11.5px] text-slate-400 mt-0.5">
            <span>Latensi</span>
            <span className="font-mono text-slate-200 font-medium">{latencyMs} ms</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[245px] flex-shrink-0 bg-slate-900 text-slate-200 flex-col min-h-screen border-r border-slate-800 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[275px] bg-slate-900 text-slate-200 transform transition-transform duration-200 lg:hidden shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-3.5 right-3.5 z-10">
          <button
            type="button"
            onClick={onMobileClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
};

/** Mobile sidebar toggle button — placed in Header */
export const SidebarToggle: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
    aria-label="Buka menu navigasi"
  >
    <Menu className="w-5 h-5" />
  </button>
);
