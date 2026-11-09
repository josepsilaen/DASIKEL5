import React from 'react';
import { CalendarX2, Info, Database } from 'lucide-react';

interface DateTrendPendingCardProps {
  unmappedReason?: string | null;
  onGoToDataBalita?: () => void;
}

export const DateTrendPendingCard: React.FC<DateTrendPendingCardProps> = ({
  unmappedReason,
  onGoToDataBalita,
}) => {
  return (
    <div className="h-[290px] flex flex-col justify-between p-5 rounded-xl bg-slate-50/80 border border-dashed border-slate-300 text-center">
      <div className="flex flex-col items-center justify-center my-auto space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs">
          <CalendarX2 className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md">
          <h4 className="text-[14.5px] font-bold text-slate-800">
            Tren Pengukuran Belum Tersedia
          </h4>
          <p className="text-[12px] sm:text-[12.5px] text-slate-500 leading-relaxed">
            {unmappedReason ||
              'Kolom tanggal pengukuran balita (tanggal_ukur) belum dipetakan atau format tanggal tidak terdeteksi pada dataset aktif saat ini.'}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-left flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>Grafik tren akan aktif begitu kolom tanggal pengukuran dipetakan</span>
        </div>
        {onGoToDataBalita && (
          <button
            type="button"
            onClick={onGoToDataBalita}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
          >
            <Database className="w-3 h-3" />
            Petakan Tanggal Pengukuran
          </button>
        )}
      </div>
    </div>
  );
};
