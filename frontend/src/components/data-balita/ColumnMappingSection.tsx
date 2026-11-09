import React, { useState } from 'react';
import { ArrowRight, RefreshCw, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import type {
  ColumnSummary,
  StandardColumnDefinition,
  ValidateMappingResponse,
} from '../../types/dataManagement';

interface ColumnMappingSectionProps {
  columns: ColumnSummary[];
  standardColumns: StandardColumnDefinition[];
  currentMapping: Record<string, string>;
  onMappingChange: (newMapping: Record<string, string>) => void;
  onValidateMapping: (mapping: Record<string, string>) => Promise<ValidateMappingResponse>;
  isValidating: boolean;
  validationResult: ValidateMappingResponse | null;
  hasUnsavedChanges?: boolean;
}

export const ColumnMappingSection: React.FC<ColumnMappingSectionProps> = ({
  columns,
  standardColumns,
  currentMapping,
  onMappingChange,
  onValidateMapping,
  isValidating,
  validationResult,
  hasUnsavedChanges = false,
}) => {
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleSelectChange = (sourceCol: string, targetKey: string) => {
    const updated = { ...currentMapping };
    if (!targetKey || targetKey === '__unmapped__') {
      delete updated[sourceCol];
    } else {
      updated[sourceCol] = targetKey;
    }
    onMappingChange(updated);
    setSaveSuccessMsg(null);
  };

  const handleApplyValidation = async () => {
    try {
      const res = await onValidateMapping(currentMapping);
      if (res.is_valid) {
        setSaveSuccessMsg('Konfigurasi pemetaan kolom berhasil divalidasi dan disimpan ke sistem.');
      } else {
        setSaveSuccessMsg(null);
      }
    } catch {
      setSaveSuccessMsg(null);
    }
  };

  // Hitung berapa kolom standar yang sudah terpetakan
  const mappedTargetKeys = new Set(Object.values(currentMapping));
  const requiredStandard = standardColumns.filter((s) => s.is_required_for_stunting);
  const mappedRequiredCount = requiredStandard.filter((s) => mappedTargetKeys.has(s.key)).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-slate-800 tracking-tight">
              Pemetaan Kolom Fleksibel
            </h3>
            <span className="text-[11.5px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
              {Object.keys(currentMapping).length} terpetakan
            </span>
            {hasUnsavedChanges && (
              <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                Perubahan belum disimpan
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-slate-500 mt-0.5">
            Petakan nama kolom pada file Anda ke variabel standar sistem Stunting Toba
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApplyValidation}
            disabled={isValidating}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-all shadow-2xs disabled:opacity-50 cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-300 ring-offset-1'
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            {isValidating
              ? 'Memvalidasi…'
              : hasUnsavedChanges
              ? 'Validasi & Simpan Pemetaan'
              : 'Validasi Pemetaan'}
          </button>
        </div>
      </div>

      {/* Banner Peringatan Perubahan Belum Disimpan */}
      {hasUnsavedChanges && (
        <div className="mx-5 mt-3.5 p-3 rounded-lg bg-amber-50/90 border border-amber-300 text-amber-900 text-[12.5px] sm:text-[13px] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Perhatian:</strong> Terdapat penyesuaian pemetaan kolom yang belum disimpan. Klik tombol <strong>Validasi & Simpan Pemetaan</strong> agar hasil mapping dapat digunakan pada menu Visualisasi.
          </span>
        </div>
      )}

      {/* Indikator Status Kelengkapan Kolom Wajib */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-[12.5px] sm:text-[13px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-600 font-medium">Kolom Wajib Stunting:</span>
          <span
            className={`font-bold px-2 py-0.5 rounded ${
              mappedRequiredCount === requiredStandard.length
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {mappedRequiredCount} dari {requiredStandard.length} terpetakan
          </span>
          <span className="text-slate-400 hidden sm:inline font-normal">(Usia, Jenis Kelamin, Berat Badan, Tinggi Badan)</span>
        </div>

        {saveSuccessMsg && (
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            {saveSuccessMsg}
          </div>
        )}
      </div>

      {validationResult && !validationResult.is_valid && (
        <div className="mx-5 mt-3.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[12.5px] sm:text-[13px] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Perhatian Pemetaan: </span>
            {validationResult.readiness_message}
          </div>
        </div>
      )}

      {/* Tabel Pemetaan */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11.5px] sm:text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-2.5">Kolom Sumber (File)</th>
              <th className="px-4 py-2.5">Tipe Data</th>
              <th className="px-4 py-2.5">Contoh Nilai</th>
              <th className="px-4 py-2.5">Nilai Kosong</th>
              <th className="px-3 py-2.5 text-center w-8"></th>
              <th className="px-5 py-2.5">Kolom Standar Aplikasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {columns.map((col) => {
              const currentTargetKey = currentMapping[col.name] || '';
              const matchedStandard = standardColumns.find((s) => s.key === currentTargetKey);
              const isSuggested = col.suggested_mapping && col.suggested_mapping === currentTargetKey;

              return (
                <tr key={col.name} className="hover:bg-slate-50/60 transition-colors">
                  {/* Kolom Sumber */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{col.name}</span>
                      {col.is_pii && (
                        <span className="px-1.5 py-0.5 text-[10.5px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">
                          Identitas
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Tipe Terdeteksi */}
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                      {col.detected_type}
                    </span>
                  </td>

                  {/* Contoh Nilai */}
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                    {col.sample_values.length > 0 ? (
                      <span className="text-[12px] text-slate-600 font-mono">
                        {col.sample_values.slice(0, 3).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[12px]">-</span>
                    )}
                  </td>

                  {/* Nilai Kosong */}
                  <td className="px-4 py-3 text-slate-600">
                    {col.null_count > 0 ? (
                      <span className="text-amber-600 text-[12px] font-semibold">
                        {col.null_count} ({col.null_percentage}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 text-[12px] font-semibold">0%</span>
                    )}
                  </td>

                  {/* Panah */}
                  <td className="px-3 py-3 text-center text-slate-300">
                    <ArrowRight className="w-4 h-4 mx-auto" />
                  </td>

                  {/* Dropdown Target Pemetaan */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={currentTargetKey}
                        onChange={(e) => handleSelectChange(col.name, e.target.value)}
                        className={`w-full max-w-xs sm:max-w-sm text-[12.5px] sm:text-[13px] rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all ${
                          matchedStandard?.is_required_for_stunting
                            ? 'border-teal-300 bg-teal-50/40 text-teal-900 font-semibold'
                            : currentTargetKey
                            ? 'border-slate-300 bg-white text-slate-800 font-medium'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        <option value="__unmapped__">-- Jangan Petakan (Abaikan) --</option>
                        <optgroup label="Kolom Inti (Wajib Analisis Stunting)">
                          {standardColumns
                            .filter((s) => s.is_required_for_stunting)
                            .map((std) => (
                              <option key={std.key} value={std.key}>
                                {std.label} {std.unit ? `(${std.unit})` : ''} *
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Kolom Administratif & Wilayah Toba">
                          {standardColumns
                            .filter((s) => s.category === 'administrative')
                            .map((std) => (
                              <option key={std.key} value={std.key}>
                                {std.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Indeks Klinis & Kelahiran">
                          {standardColumns
                            .filter((s) => s.category === 'clinical')
                            .map((std) => (
                              <option key={std.key} value={std.key}>
                                {std.label} {std.unit ? `(${std.unit})` : ''}
                              </option>
                            ))}
                        </optgroup>
                      </select>

                      {isSuggested && (
                        <span
                          title="Kandidat kecocokan otomatis terdeteksi"
                          className="flex items-center text-teal-600 flex-shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-[12px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
        <p>
          Tanda bintang (<span className="text-teal-600 font-bold">*</span>) menandakan variabel inti yang dibutuhkan untuk menghitung indikator stunting (TB/U).
        </p>
        <p className="text-[11.5px] text-slate-400">
          Kolom yang diabaikan tidak akan digunakan dalam analisis selanjutnya.
        </p>
      </div>
    </div>
  );
};
