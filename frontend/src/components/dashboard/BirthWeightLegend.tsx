import React from 'react';

export const BirthWeightLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs text-xs">
      {/* Kelompok Status Stunting */}
      <div className="flex items-center gap-4">
        <span className="font-semibold text-slate-700">Status Stunting:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-2xs" />
          <span className="text-slate-700 font-medium">Stunting (TB/U &lt; -2 SD)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-2xs" />
          <span className="text-slate-700 font-medium">Tidak Stunting (TB/U &ge; -2 SD)</span>
        </div>
      </div>

      <div className="hidden sm:block h-4 w-px bg-slate-200" />

      {/* Kelompok Kategori BBLR */}
      <div className="flex items-center gap-4">
        <span className="font-semibold text-slate-700">Kategori BBLR:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" />
          <span className="text-slate-700 font-medium">BBLR (&lt; 2,5 kg)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
          <span className="text-slate-700 font-medium">Normal (&ge; 2,5 kg)</span>
        </div>
      </div>
    </div>
  );
};

