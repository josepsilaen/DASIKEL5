import React from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import type { NavItem } from '../../types/navigation';

interface PlaceholderViewProps {
  item: NavItem;
  onBackToDashboard: () => void;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  item,
  onBackToDashboard,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-10 text-center max-w-xl mx-auto my-8 shadow-xs">
      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-2xs">
        <Clock className="w-6 h-6" />
      </div>

      <div className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-3">
        Modul Dalam Perencanaan
      </div>

      <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-900 mb-2.5 tracking-tight">
        {item.label}
      </h2>

      <p className="text-[13.5px] sm:text-[14px] text-slate-600 leading-relaxed mb-6 max-w-lg mx-auto">
        Modul <span className="font-semibold text-slate-800">{item.label}</span> dijadwalkan
        untuk dikembangkan pada tahap berikutnya sesuai roadmap proyek. Halaman ini
        disediakan untuk memetakan arsitektur sistem Stunting Toba secara komprehensif.
      </p>

      <button
        type="button"
        onClick={onBackToDashboard}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-[13.5px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shadow-2xs"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Dashboard
      </button>
    </div>
  );
};
