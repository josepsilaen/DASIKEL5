import React from 'react';
import type { HeatmapCell } from '../../../types/dashboard';

interface DashboardCorrelationHeatmapProps {
  variables: string[];
  cells: HeatmapCell[];
}

export const DashboardCorrelationHeatmap: React.FC<DashboardCorrelationHeatmapProps> = ({
  variables,
  cells,
}) => {
  if (variables.length === 0 || cells.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        Data matriks korelasi belum cukup untuk dihitung.
      </div>
    );
  }

  // Lookup map: `${row}_${col}` -> cell
  const cellMap = new Map<string, HeatmapCell>();
  cells.forEach((c) => {
    cellMap.set(`${c.row_var}__${c.col_var}`, c);
  });

  const getCellColor = (r: number | null | undefined, isDiagonal: boolean) => {
    if (isDiagonal) return 'bg-slate-200 text-slate-700';
    if (r === null || r === undefined || isNaN(r)) return 'bg-slate-50 text-slate-400';

    if (r >= 0.7) return 'bg-emerald-600 text-white font-bold';
    if (r >= 0.4) return 'bg-emerald-500 text-white font-medium';
    if (r >= 0.2) return 'bg-emerald-300 text-emerald-950 font-medium';
    if (r > 0.05) return 'bg-emerald-100 text-emerald-900';
    if (r >= -0.05) return 'bg-slate-100 text-slate-700';
    if (r >= -0.2) return 'bg-rose-100 text-rose-900';
    if (r >= -0.5) return 'bg-rose-300 text-rose-950 font-medium';
    return 'bg-rose-600 text-white font-bold';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Matriks Korelasi Pearson (4x4)
          </h4>
          <p className="text-[11px] text-slate-400">
            Korelasi linear antar-variabel numerik kunci balita
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2.5 h-2.5 rounded-xs bg-rose-400 inline-block"></span>
          <span>Negatif (-1)</span>
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 inline-block ml-1"></span>
          <span>0</span>
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block ml-1"></span>
          <span>Positif (+1)</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-slate-400 font-normal border-b border-slate-200">
                Variabel
              </th>
              {variables.map((col) => (
                <th
                  key={col}
                  className="p-2 font-semibold text-slate-700 border-b border-slate-200 text-center text-[11px]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variables.map((row) => (
              <tr key={row} className="border-b border-slate-100 last:border-b-0">
                <td className="p-2 text-left font-medium text-slate-700 whitespace-nowrap bg-slate-50/50">
                  {row}
                </td>
                {variables.map((col) => {
                  const cell = cellMap.get(`${row}__${col}`);
                  const isDiag = row === col;
                  const r = isDiag ? 1.0 : cell?.correlation;
                  const sample = cell?.sample_size ?? 0;
                  const colorClass = getCellColor(r, isDiag);

                  return (
                    <td
                      key={col}
                      className="p-1.5"
                      title={
                        isDiag
                          ? `${row}: Variabel yang sama (r=1.0)`
                          : `${row} vs ${col}: r = ${r !== null && r !== undefined ? r.toFixed(3) : '-'} (N=${sample})`
                      }
                    >
                      <div
                        className={`h-11 rounded-lg flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-default ${colorClass}`}
                      >
                        <span className="text-xs">
                          {isDiag ? '1.00' : r !== null && r !== undefined ? (r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2)) : '-'}
                        </span>
                        {!isDiag && sample > 0 && (
                          <span className="text-[9px] opacity-75">N={sample}</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

