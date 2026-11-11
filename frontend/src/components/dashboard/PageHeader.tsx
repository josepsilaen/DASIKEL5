import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  connectionStatus?: 'connected' | 'checking' | 'disconnected';
  latencyMs?: number;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  onRefresh,
  isRefreshing = false,
  connectionStatus,
  latencyMs,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
      <div>
        <h1 className="text-[24px] sm:text-[27px] font-bold text-slate-900 leading-tight tracking-tight">
          {title}
        </h1>
        <p className="text-[13.5px] sm:text-[14px] text-slate-500 mt-1 leading-relaxed max-w-3xl">
          {description}
        </p>
      </div>

      {(onRefresh || connectionStatus) && (
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          {connectionStatus && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : connectionStatus === 'checking'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
              title={
                connectionStatus === 'connected'
                  ? `Backend API terhubung${latencyMs ? ` (${latencyMs}ms)` : ''}`
                  : connectionStatus === 'checking'
                  ? 'Sedang memeriksa koneksi backend...'
                  : 'Koneksi ke backend terputus'
              }
            >
              {connectionStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold">API Terhubung</span>
                  {latencyMs && <span className="text-[11px] text-emerald-600/80">({latencyMs}ms)</span>}
                </>
              ) : connectionStatus === 'checking' ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span>Memeriksa API</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  <span className="font-semibold">API Terputus</span>
                </>
              )}
            </div>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Segarkan ringkasan data dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
              <span>Segarkan Data</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
