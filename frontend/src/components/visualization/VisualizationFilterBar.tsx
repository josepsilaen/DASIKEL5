import React from 'react';
import { Filter, RotateCcw, Building2, MapPin, Calendar, UserCheck } from 'lucide-react';
import type { FilterOptions, VisualizationFilterRequest } from '../../types/visualization';

interface VisualizationFilterBarProps {
  filterOptions: FilterOptions;
  currentFilter: VisualizationFilterRequest;
  onFilterChange: (newFilter: VisualizationFilterRequest) => void;
  totalFiltered: number;
  totalUnfiltered: number;
  isLoading: boolean;
}

export const VisualizationFilterBar: React.FC<VisualizationFilterBarProps> = ({
  filterOptions,
  currentFilter,
  onFilterChange,
  totalFiltered,
  totalUnfiltered,
  isLoading,
}) => {
  const hasKecamatan = filterOptions.kecamatan_list && filterOptions.kecamatan_list.length > 0;
  const hasPuskesmas = filterOptions.puskesmas_list && filterOptions.puskesmas_list.length > 0;
  const hasGender = filterOptions.jenis_kelamin_list && filterOptions.jenis_kelamin_list.length > 0;
  const hasAgeGroup = filterOptions.age_group_list && filterOptions.age_group_list.length > 0;

  const isAnyFilterActive = Boolean(
    currentFilter.kecamatan ||
    currentFilter.puskesmas ||
    currentFilter.jenis_kelamin ||
    currentFilter.age_group
  );

  const handleReset = () => {
    onFilterChange({
      ...currentFilter,
      kecamatan: null,
      puskesmas: null,
      jenis_kelamin: null,
      age_group: null,
    });
  };

  // If none of the filterable variables exist in the dataset, don't show an empty bar
  if (!hasKecamatan && !hasPuskesmas && !hasGender && !hasAgeGroup) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100/80 flex items-center justify-center text-teal-600 shadow-2xs">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">
              Filter Visualisasi Data
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Saring agregasi statistik berdasarkan variabel yang tersedia pada dataset aktif
            </p>
          </div>
        </div>

        {/* N Sample Counter & Reset */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-[12px] text-slate-500">Sampel Dianalisis: </span>
            <span className="text-[14px] font-bold text-slate-900 font-mono">
              {totalFiltered.toLocaleString('id-ID')}
            </span>
            {totalFiltered !== totalUnfiltered && (
              <span className="text-[12px] text-slate-400 font-mono">
                {' '}/ {totalUnfiltered.toLocaleString('id-ID')} balita
              </span>
            )}
          </div>

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 shadow-2xs"
              title="Reset seluruh filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
        {/* 1. Filter Kecamatan */}
        {hasKecamatan && (
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Wilayah Kecamatan</span>
            </label>
            <select
              value={currentFilter.kecamatan || ''}
              onChange={(e) =>
                onFilterChange({
                  ...currentFilter,
                  kecamatan: e.target.value || null,
                })
              }
              disabled={isLoading}
              className="w-full text-[13px] font-medium bg-slate-50/70 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
            >
              <option value="">Semua Kecamatan ({filterOptions.kecamatan_list.length})</option>
              {filterOptions.kecamatan_list.map((kec) => (
                <option key={kec} value={kec}>
                  {kec}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 2. Filter Puskesmas */}
        {hasPuskesmas && (
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Puskesmas Pelayanan</span>
            </label>
            <select
              value={currentFilter.puskesmas || ''}
              onChange={(e) =>
                onFilterChange({
                  ...currentFilter,
                  puskesmas: e.target.value || null,
                })
              }
              disabled={isLoading}
              className="w-full text-[13px] font-medium bg-slate-50/70 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
            >
              <option value="">Semua Puskesmas ({filterOptions.puskesmas_list.length})</option>
              {filterOptions.puskesmas_list.map((pkm) => (
                <option key={pkm} value={pkm}>
                  {pkm}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Filter Kelompok Usia */}
        {hasAgeGroup && (
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Kelompok Usia</span>
            </label>
            <select
              value={currentFilter.age_group || ''}
              onChange={(e) =>
                onFilterChange({
                  ...currentFilter,
                  age_group: e.target.value || null,
                })
              }
              disabled={isLoading}
              className="w-full text-[13px] font-medium bg-slate-50/70 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
            >
              <option value="">Semua Kelompok Usia ({filterOptions.age_group_list.length})</option>
              {filterOptions.age_group_list.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 4. Filter Jenis Kelamin */}
        {hasGender && (
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Jenis Kelamin</span>
            </label>
            <select
              value={currentFilter.jenis_kelamin || ''}
              onChange={(e) =>
                onFilterChange({
                  ...currentFilter,
                  jenis_kelamin: e.target.value || null,
                })
              }
              disabled={isLoading}
              className="w-full text-[13px] font-medium bg-slate-50/70 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
            >
              <option value="">Semua Gender</option>
              {filterOptions.jenis_kelamin_list.map((g) => {
                const norm = g.toUpperCase();
                const display =
                  norm === 'L' || norm === 'LAKI-LAKI'
                    ? 'Laki-laki (L)'
                    : norm === 'P' || norm === 'PEREMPUAN'
                    ? 'Perempuan (P)'
                    : g;
                return (
                  <option key={g} value={g}>
                    {display}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
