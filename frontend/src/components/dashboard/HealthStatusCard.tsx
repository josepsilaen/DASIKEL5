import React from 'react';
import { CheckCircle, XCircle, RefreshCw, Radio } from 'lucide-react';
import type { HealthCheckResult } from '../../types/health';

interface HealthStatusCardProps {
  healthResult: HealthCheckResult;
  onRefresh: () => void;
  isLoading: boolean;
}

export const HealthStatusCard: React.FC<HealthStatusCardProps> = ({
  healthResult,
  onRefresh,
  isLoading,
}) => {
  const isConnected = healthResult.status === 'connected';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[16px] font-bold text-slate-800 tracking-tight">
            Status Koneksi Backend
          </h3>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Endpoint: GET /api/health
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Memeriksa…' : 'Uji Koneksi'}
        </button>
      </div>

      {/* Status banner */}
      <div
        className={`p-4 rounded-lg border flex items-start gap-3 ${
          isConnected
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-rose-50/70 border-rose-200'
        }`}
      >
        {isConnected ? (
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p
            className={`text-[14px] font-bold ${
              isConnected ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            {isConnected ? 'Backend Terhubung' : 'Backend Tidak Terhubung'}
          </p>
          <p
            className={`text-[12.5px] mt-0.5 ${
              isConnected ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isConnected
              ? `${healthResult.data?.message ?? 'OK'} — Latensi ${healthResult.latencyMs ?? '-'} ms, versi ${healthResult.data?.version ?? '-'}`
              : healthResult.error ?? 'Server tidak dapat dihubungi.'}
          </p>
        </div>
      </div>

      {/* Troubleshooting when disconnected */}
      {!isConnected && (
        <div className="mt-3.5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] text-slate-600">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1.5 text-[13px]">
            <Radio className="w-3.5 h-3.5 text-amber-600" />
            Langkah menjalankan backend:
          </div>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-600 font-mono text-[11.5px]">
            <li>cd backend</li>
            <li>.\venv\Scripts\Activate.ps1</li>
            <li>uvicorn app.main:app --reload --port 8000</li>
          </ol>
        </div>
      )}
    </div>
  );
};
