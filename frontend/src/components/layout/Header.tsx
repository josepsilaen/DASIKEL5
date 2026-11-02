import React from 'react';
import { RefreshCw } from 'lucide-react';
import { SidebarToggle } from './Sidebar';
import type { ConnectionStatus } from '../../types/health';

interface HeaderProps {
  pageTitle: string;
  pageDescription: string;
  onSidebarToggle: () => void;
  connectionStatus: ConnectionStatus;
  onRefreshHealth: () => void;
  isHealthLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  pageDescription,
  onSidebarToggle,
  connectionStatus,
  onRefreshHealth,
  isHealthLoading,
}) => {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-[60px]">
        {/* Left: mobile toggle + page info */}
        <div className="flex items-center gap-3 min-w-0">
          <SidebarToggle onClick={onSidebarToggle} />
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-slate-800 leading-tight truncate">
              {pageTitle}
            </h2>
            <p className="text-[12px] text-slate-500 leading-tight mt-0.5 truncate hidden sm:block">
              {pageDescription}
            </p>
          </div>
        </div>

        {/* Right: backend status + refresh */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-[12px] text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5">
            <span className="relative flex h-2 w-2">
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
            <span className="font-medium">
              {connectionStatus === 'connected'
                ? 'API Terhubung'
                : connectionStatus === 'checking'
                ? 'Memeriksa…'
                : 'API Terputus'}
            </span>
          </div>

          <button
            type="button"
            onClick={onRefreshHealth}
            disabled={isHealthLoading}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 disabled:opacity-40 transition-colors"
            title="Periksa ulang koneksi backend"
          >
            <RefreshCw className={`w-4 h-4 ${isHealthLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
