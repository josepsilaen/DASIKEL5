import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DashboardErrorStateProps {
  errorMessage?: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const DashboardErrorState: React.FC<DashboardErrorStateProps> = ({
  errorMessage,
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-rose-200 shadow-xs p-6 sm:p-9 lg:p-11 text-center max-w-xl mx-auto space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-2xs">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Gagal Memuat Data Dashboard
        </h3>
        <p className="text-[13.5px] text-slate-600 leading-relaxed">
          Terjadi kendala saat menghubungi server backend untuk mengambil ringkasan dataset aktif.
          Data analitik tidak dapat ditampilkan sementara demi menjaga akurasi penelitian.
        </p>
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200/80 text-[12px] text-rose-800 font-mono text-left break-all">
            Rincian: {errorMessage}
          </div>
        )}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-semibold text-[13.5px] transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Mencoba Menghubungkan...' : 'Coba Lagi'}
        </button>
      </div>

      <p className="text-[11.5px] text-slate-400">
        * Pastikan backend server FastAPI aktif pada port 8000 dan dapat diakses.
      </p>
    </div>
  );
};

