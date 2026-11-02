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
    <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
        <Clock className="w-6 h-6" />
      </div>

      <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-3">
        Modul Dalam Perencanaan
      </div>

      <h2 className="text-[20px] font-bold text-slate-800 mb-2">
        {item.label}
      </h2>

      <p className="text-[14px] text-slate-500 leading-relaxed mb-6">
        Modul <span className="font-semibold text-slate-700">{item.label}</span> dijadwalkan
        untuk dikembangkan pada tahap berikutnya sesuai roadmap proyek. Navigasi ini
        disediakan pada tahap ini untuk memetakan struktur arsitektur sistem Stunting Toba
        secara komprehensif.
      </p>

      <button
        type="button"
        onClick={onBackToDashboard}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Dashboard
      </button>
    </div>
  );
};
