import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Lock, EyeOff, FileSpreadsheet } from 'lucide-react';
import type { ColumnSummary } from '../../types/dataManagement';

interface DatasetPreviewTableProps {
  columns: ColumnSummary[];
  rows: Record<string, any>[];
  filename: string;
}

export const DatasetPreviewTable: React.FC<DatasetPreviewTableProps> = ({
  columns,
  rows,
  filename,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [maskPii, setMaskPii] = useState<boolean>(true);

  // Filter baris berdasarkan kata kunci pencarian
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => v !== null && String(v).toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const piiColNames = useMemo(
    () => new Set(columns.filter((c) => c.is_pii).map((c) => c.name)),
    [columns]
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      {/* Header Panel */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-slate-800 tracking-tight">
              Pratinjau Data Balita ({filteredRows.length.toLocaleString('id-ID')} baris)
            </h3>
            <span className="text-[11.5px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
              Sumber: {filename}
            </span>
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Menampilkan sampel baris teratas hasil parsing berkas yang sedang diunggah
          </p>
        </div>

        {/* Action Controls: Search & Privacy Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nilai di tabel…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8.5 pr-3 py-1.5 text-[12.5px] sm:text-[13px] rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-44 sm:w-52"
            />
          </div>

          {/* Privacy Masking Toggle */}
          {piiColNames.size > 0 && (
            <button
              type="button"
              onClick={() => setMaskPii(!maskPii)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                maskPii
                  ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title={maskPii ? 'Data identitas disamarkan' : 'Tampilkan data identitas tanpa penyamaran'}
            >
              {maskPii ? <Lock className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {maskPii ? 'Identitas Disamarkan' : 'Buka Penyamaran'}
            </button>
          )}

          {/* Page Size Select */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-[12px] font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
          >
            <option value={10}>10 baris</option>
            <option value={25}>25 baris</option>
            <option value={50}>50 baris</option>
          </select>
        </div>
      </div>

      {/* Info Banner Sumber Data */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[12px] text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
          <span>
            Data di bawah ini dibaca langsung secara sementara dari file <span className="font-bold text-slate-800">{filename}</span>.
          </span>
        </div>
        <span className="text-[11.5px] font-medium text-slate-500">
          Halaman {validCurrentPage} dari {totalPages}
        </span>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px] sm:text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] sm:text-[11.5px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-2.5 text-center w-12">#</th>
              {columns.map((c) => (
                <th key={c.name} className="px-4 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>{c.name}</span>
                    {c.is_pii && (
                      <span title="Kolom memuat data pribadi" className="text-purple-600">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span className="block text-[10.5px] font-mono text-slate-400 capitalize mt-0.5 font-normal">
                    {c.detected_type}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-8 text-center text-slate-400 text-[13px]">
                  Tidak ada baris data yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                const globalIndex = startIndex + rowIdx + 1;
                return (
                  <tr key={rowIdx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-center text-slate-400 text-[11px] font-mono">
                      {globalIndex}
                    </td>
                    {columns.map((col) => {
                      const val = row[col.name];
                      const isNull = val === null || val === undefined || String(val).trim() === '';
                      const isPiiCol = col.is_pii;

                      return (
                        <td key={col.name} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                          {isNull ? (
                            <span className="text-slate-300 italic text-[11px]">-</span>
                          ) : isPiiCol && !maskPii ? (
                            <span className="font-mono text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-medium text-[12px]">
                              {String(val)}
                            </span>
                          ) : (
                            <span className="tabular-nums">{String(val)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] sm:text-[13px]">
        <p className="text-slate-600">
          Menampilkan baris <span className="font-bold text-slate-800">{filteredRows.length > 0 ? startIndex + 1 : 0}</span> sampai{' '}
          <span className="font-bold text-slate-800">{Math.min(startIndex + pageSize, filteredRows.length)}</span> dari total{' '}
          <span className="font-bold text-slate-800">{filteredRows.length}</span> baris
        </p>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={validCurrentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white shadow-2xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
          </button>
          <span className="px-3 py-1 text-[12px] font-semibold text-slate-700">
            {validCurrentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={validCurrentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white shadow-2xs"
          >
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
