import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, CheckCircle, ShieldAlert } from 'lucide-react';
import type { QualityIssue } from '../../types/dataManagement';

interface QualityIssuesPanelProps {
  issues: QualityIssue[];
  identicalDuplicates: number;
}

export const QualityIssuesPanel: React.FC<QualityIssuesPanelProps> = ({
  issues,
  identicalDuplicates,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (issues.length === 0 && identicalDuplicates === 0) {
    return (
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800">
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div className="text-[13px]">
          <span className="font-semibold">Kualitas Data Sangat Baik: </span>
          Tidak ditemukan nilai kosong kritis, baris duplikat identik, atau anomali rentang nilai pada dataset ini.
        </div>
      </div>
    );
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-slate-800">
                Temuan Validasi & Kualitas Data
              </h3>
              <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {issues.length} catatan
              </span>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Evaluasi konsistensi format, kelengkapan nilai, dan duplikasi baris
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-700">
              {errorCount} Kritis
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700">
              {warningCount} Peringatan
            </span>
          )}
          {infoCount > 0 && (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700">
              {infoCount} Info
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3">
          {/* Edukasi / Catatan Pengingat */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[12px] text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700">Prinsip Validasi Sistem: </span>
              Sistem tidak akan menghapus baris, mengubah satuan, atau mengisi nilai kosong secara sepihak tanpa instruksi pengguna.
              Perhatikan perbedaan antara <span className="font-medium text-slate-700">duplikasi baris identik</span> (seluruh kolom sama) dan{' '}
              <span className="font-medium text-slate-700">pencatatan berulang balita</span> (anak yang sama diukur pada bulan berbeda).
            </div>
          </div>

          {/* Daftar Isu Kualitas */}
          <div className="divide-y divide-slate-100">
            {issues.map((issue, idx) => {
              const isError = issue.severity === 'error';
              const isWarning = issue.severity === 'warning';
              const Icon = isError ? AlertCircle : isWarning ? AlertTriangle : Info;

              return (
                <div key={idx} className="py-3 flex items-start gap-3">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      isError
                        ? 'text-rose-500'
                        : isWarning
                        ? 'text-amber-500'
                        : 'text-blue-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-slate-800">
                        {issue.message}
                      </p>
                      {issue.column && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                          {issue.column}
                        </span>
                      )}
                    </div>
                    {issue.details && (
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        {issue.details}
                      </p>
                    )}
                  </div>
                  {issue.affected_rows_count > 0 && (
                    <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap tabular-nums">
                      {issue.affected_rows_count} baris
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
