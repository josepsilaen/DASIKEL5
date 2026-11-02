import React from 'react';
import { Info } from 'lucide-react';

export const DataDisclaimer: React.FC = () => {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-100/70 border border-slate-200 text-slate-600">
      <Info className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
      <div className="text-[13px] leading-relaxed">
        <span className="font-semibold text-slate-700">Keterangan data: </span>
        Seluruh angka, grafik, dan tabel pada halaman ini menggunakan{' '}
        <span className="font-semibold text-slate-700">data contoh (dummy)</span>{' '}
        yang dibuat untuk keperluan perancangan antarmuka. Data ini belum
        mewakili kondisi nyata di Kabupaten Toba dan tidak mengandung informasi
        identitas pribadi.
      </div>
    </div>
  );
};
