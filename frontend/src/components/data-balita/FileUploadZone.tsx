import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, AlertCircle, FileSpreadsheet, Loader2, Sparkles } from 'lucide-react';

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  onLoadSyntheticSample: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileUpload,
  onLoadSyntheticSample,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onClearError();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndUpload(file);
      // Reset input agar file yang sama bisa dipilih ulang jika diperlukan
      e.target.value = '';
    }
  };

  const validateAndUpload = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.csv' && ext !== '.xlsx') {
      alert('Format file tidak didukung. Harap pilih berkas .csv atau .xlsx');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran file melebihi batas maksimum 15 MB.');
      return;
    }

    onFileUpload(file);
  };

  return (
    <div className="space-y-4">
      {/* Error Alert jika terjadi kegagalan */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 animate-fadeIn shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-bold">Gagal Memproses File</p>
              <p className="text-[13px] text-rose-700 mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-[12px] font-semibold text-rose-600 hover:text-rose-800 hover:underline px-1.5 py-0.5"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Area Drag and Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-7 sm:p-9 text-center transition-all cursor-pointer select-none shadow-2xs
          ${
            isDragOver
              ? 'border-teal-500 bg-teal-50/70 shadow-md scale-[1.003]'
              : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/60'
          }
          ${isLoading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-xs border border-teal-100">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <p className="text-[16px] sm:text-[17px] font-bold text-slate-800">
              {isLoading ? 'Sedang Memproses Berkas…' : 'Tarik & Letakkan Berkas di Sini, atau Klik untuk Memilih'}
            </p>
            <p className="text-[13px] text-slate-500 mt-1">
              Mendukung format berkas data balita <span className="font-bold text-slate-700">.CSV</span> dan{' '}
              <span className="font-bold text-slate-700">Excel (.XLSX)</span> (Maks. 15 MB)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-medium bg-slate-100 text-slate-600">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              CSV (Pemisah Koma / Titik Koma)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-medium bg-slate-100 text-slate-600">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Excel Workbook (.xlsx)
            </span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[13.5px] font-semibold transition-colors shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menganalisis Dataset…
                </>
              ) : (
                'Pilih File dari Komputer'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action: Muat Contoh Data Sintetis */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-100/80 border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Belum memiliki file data? Anda dapat mencoba simulasi menggunakan sampel data antropometri sintetis.
          </p>
        </div>
        <button
          type="button"
          onClick={onLoadSyntheticSample}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[12.5px] font-semibold whitespace-nowrap transition-colors shadow-2xs"
        >
          Muat Sampel Sintetis Balita Toba
        </button>
      </div>
    </div>
  );
};
