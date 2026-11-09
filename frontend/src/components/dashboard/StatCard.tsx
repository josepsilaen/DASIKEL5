import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StatCardData } from '../../data/dashboard';

interface StatCardProps {
  data: StatCardData;
  isSynthetic?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ data, isSynthetic: propIsSynthetic }) => {
  const { label, value, unit, description, trend, isSynthetic: dataIsSynthetic } = data;
  const isSynthetic = propIsSynthetic ?? dataIsSynthetic;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-xs transition-all shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <p className="text-[13px] font-semibold text-slate-500">{label}</p>
          {isSynthetic && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0"
              title="Statistik ini merupakan data contoh statis untuk pengujian UI"
            >
              Data Contoh
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[26px] sm:text-[28px] font-bold text-slate-900 leading-none tabular-nums tracking-tight">
            {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
          </span>
          <span className="text-[13px] text-slate-400 font-medium">{unit}</span>
        </div>

        {trend && (
          <div className="flex items-center gap-1.5 mt-2">
            {trend.direction === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            ) : trend.direction === 'down' ? (
              <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span
              className={`text-[12px] font-bold ${
                trend.direction === 'up'
                  ? 'text-teal-600'
                  : trend.direction === 'down'
                  ? 'text-amber-600'
                  : 'text-slate-500'
              }`}
            >
              {trend.value}%
            </span>
            <span className="text-[11px] text-slate-400">dari total</span>
          </div>
        )}
      </div>

      <p className="text-[12px] text-slate-500 mt-2.5 leading-relaxed">{description}</p>
    </div>
  );
};
