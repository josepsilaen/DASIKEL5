import React from 'react';
import type { BoxPlotStats } from '../../../types/dashboard';

interface DashboardBoxPlotVisualProps {
  title?: string;
  items: {
    label: string;
    color: string;
    stats?: BoxPlotStats | null;
  }[];
  unit?: string;
  minScale?: number;
  maxScale?: number;
  thresholdLine?: {
    value: number;
    label: string;
    color?: string;
  };
}

export const DashboardBoxPlotVisual: React.FC<DashboardBoxPlotVisualProps> = ({
  title,
  items,
  unit = '',
  minScale,
  maxScale,
  thresholdLine,
}) => {
  // Hitung skala data global jika tidak disediakan
  const validStats = items.map((i) => i.stats).filter((s): s is BoxPlotStats => Boolean(s));

  if (validStats.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        Data distribusi belum tersedia untuk kelompok ini.
      </div>
    );
  }

  const globalMin =
    minScale !== undefined
      ? minScale
      : Math.min(...validStats.map((s) => s.min_value), thresholdLine ? thresholdLine.value : Infinity);
  const globalMax =
    maxScale !== undefined
      ? maxScale
      : Math.max(...validStats.map((s) => s.max_value), thresholdLine ? thresholdLine.value : -Infinity);

  const range = globalMax - globalMin || 1;
  const padding = range * 0.08;
  const domainMin = globalMin - padding;
  const domainMax = globalMax + padding;
  const domainRange = domainMax - domainMin || 1;

  const toPercent = (val: number) => {
    const clamped = Math.max(domainMin, Math.min(domainMax, val));
    return ((clamped - domainMin) / domainRange) * 100;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
      {title && (
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">{title}</h4>
          <span className="text-[11px] text-slate-400">Box & Whisker Plot</span>
        </div>
      )}

      {/* Threshold indicator jika ada */}
      {thresholdLine && (
        <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
          <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-red-500"></span>
          <span>
            {thresholdLine.label}: <strong>{thresholdLine.value} {unit}</strong>
          </span>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => {
          const stats = item.stats;
          if (!stats || stats.count === 0) {
            return (
              <div key={item.label} className="text-xs text-slate-400 py-1">
                {item.label}: Data tidak mencukupi (N=0)
              </div>
            );
          }

          const minX = toPercent(stats.min_value);
          const q1X = toPercent(stats.q1);
          const medianX = toPercent(stats.median);
          const q3X = toPercent(stats.q3);
          const maxX = toPercent(stats.max_value);
          const meanX = toPercent(stats.mean);

          return (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-700 flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
                <span className="text-slate-500 text-[11px]">
                  N = <strong>{stats.count.toLocaleString('id-ID')}</strong> | Median: <strong>{stats.median.toFixed(2)} {unit}</strong> | Rata-rata: <strong>{stats.mean.toFixed(2)} {unit}</strong>
                </span>
              </div>

              {/* Box Plot SVG Strip */}
              <div className="relative h-12 bg-slate-50/80 rounded-md border border-slate-100 px-2 py-1 flex items-center">
                {/* Threshold line */}
                {thresholdLine && (
                  <div
                    className="absolute top-0 bottom-0 border-r-2 border-dashed border-red-400 z-10"
                    style={{ left: `${toPercent(thresholdLine.value)}%` }}
                    title={`${thresholdLine.label}: ${thresholdLine.value}`}
                  />
                )}

                {/* Left Whisker Line */}
                <div
                  className="absolute h-0.5 bg-slate-400"
                  style={{
                    left: `${minX}%`,
                    width: `${Math.max(0, q1X - minX)}%`,
                  }}
                />
                {/* Min Cap */}
                <div
                  className="absolute w-0.5 h-4 bg-slate-400 -translate-y-1/2 top-1/2"
                  style={{ left: `${minX}%` }}
                  title={`Min: ${stats.min_value.toFixed(2)}`}
                />

                {/* Right Whisker Line */}
                <div
                  className="absolute h-0.5 bg-slate-400"
                  style={{
                    left: `${q3X}%`,
                    width: `${Math.max(0, maxX - q3X)}%`,
                  }}
                />
                {/* Max Cap */}
                <div
                  className="absolute w-0.5 h-4 bg-slate-400 -translate-y-1/2 top-1/2"
                  style={{ left: `${maxX}%` }}
                  title={`Max: ${stats.max_value.toFixed(2)}`}
                />

                {/* Interquartile Range (IQR Box) */}
                <div
                  className="absolute h-6 rounded-xs -translate-y-1/2 top-1/2 border shadow-xs"
                  style={{
                    left: `${q1X}%`,
                    width: `${Math.max(2, q3X - q1X)}%`,
                    backgroundColor: `${item.color}33`,
                    borderColor: item.color,
                  }}
                  title={`IQR: Q1=${stats.q1.toFixed(2)} - Q3=${stats.q3.toFixed(2)}`}
                >
                  {/* Median Line */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-slate-900 rounded-full -translate-x-1/2"
                    style={{ left: `${((medianX - q1X) / (q3X - q1X || 1)) * 100}%` }}
                    title={`Median: ${stats.median.toFixed(2)}`}
                  />
                </div>

                {/* Mean Diamond / Dot */}
                <div
                  className="absolute w-2.5 h-2.5 rounded-full bg-emerald-600 border border-white shadow-xs -translate-x-1/2 -translate-y-1/2 top-1/2 z-20"
                  style={{ left: `${meanX}%` }}
                  title={`Rata-rata: ${stats.mean.toFixed(2)}`}
                />
              </div>

              {/* Micro stats legend */}
              <div className="flex justify-between text-[10px] text-slate-400 px-1">
                <span>Min: {stats.min_value.toFixed(1)}</span>
                <span>Q1: {stats.q1.toFixed(1)}</span>
                <span>Q3: {stats.q3.toFixed(1)}</span>
                <span>Max: {stats.max_value.toFixed(1)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

