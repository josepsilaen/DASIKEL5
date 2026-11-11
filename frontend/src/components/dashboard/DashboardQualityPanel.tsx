import React from 'react';
import { ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, Info } from 'lucide-react';

interface DashboardQualityPanelProps {
  totalQualityIssues: number;
  missingValuesCount: number;
  duplicatesCount: number;
  outOfRangeCount: number;
  unmappedRequiredColumns: string[];
  qualityHighlights: string[];
  warnings: string[];
  onGoToDataBalita: () => void;
}

export const DashboardQualityPanel: React.FC<DashboardQualityPanelProps> = ({
  totalQualityIssues,
  missingValuesCount,
  duplicatesCount,
  outOfRangeCount,
  unmappedRequiredColumns,
  qualityHighlights,
  warnings,
  onGoToDataBalita,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">
              Kualitas dan Kelengkapan Data
            </h3>
            <p className="text-[12px] text-slate-500">
              Evaluasi kepatuhan format, kelengkapan variabel, dan integritas catatan balita
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToDataBalita}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100/70 border border-teal-200/90 transition-colors cursor-pointer self-start sm:self-center"
        >
          Pemeriksaan Lengkap di Data Balita
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Kotak Metrik Kualitas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Total Temuan Isu
          </span>
          <span className="text-[20px] font-bold text-slate-900 tabular-nums">
            {totalQualityIssues.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-slate-400 block">isu kualitas terdeteksi</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Nilai Kosong
          </span>
          <span className="text-[20px] font-bold text-slate-900 tabular-nums">
            {missingValuesCount.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-slate-400 block">sel atribut kosong</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Baris Duplikat
          </span>
          <span className="text-[20px] font-bold text-slate-900 tabular-nums">
            {duplicatesCount.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-slate-400 block">duplikasi identik</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Di Luar Rentang
          </span>
          <span className="text-[20px] font-bold text-slate-900 tabular-nums">
            {outOfRangeCount.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-slate-400 block">nilai antropometri ekstrem</span>
        </div>
      </div>

      {/* Rangkuman Isu & Peringatan Metodologis */}
      <div className="space-y-2 pt-1">
        <h4 className="text-[12.5px] font-bold text-slate-700 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          Sorotan Kualitas & Catatan Metodologis
        </h4>
        <div className="space-y-1.5">
          {qualityHighlights.map((highlight, idx) => (
            <div
              key={idx}
              className="px-3 py-2 rounded-lg bg-slate-50/80 border border-slate-200/80 text-[12px] text-slate-700 flex items-start gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
              <span>{highlight}</span>
            </div>
          ))}

          {unmappedRequiredColumns.length > 0 && (
            <div className="px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[12px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <span>
                <strong>Variabel standar wajib belum dipetakan:</strong>{' '}
                {unmappedRequiredColumns.join(', ')}.
              </span>
            </div>
          )}

          {warnings.map((warn, idx) => (
            <div
              key={`warn-${idx}`}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[12px] text-slate-600 flex items-start gap-2"
            >
              <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

