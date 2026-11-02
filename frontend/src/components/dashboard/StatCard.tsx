import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StatCardData } from '../../data/dashboard';

interface StatCardProps {
  data: StatCardData;
}

export const StatCard: React.FC<StatCardProps> = ({ data }) => {
  const { label, value, unit, description, trend } = data;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
      <p className="text-[13px] font-medium text-slate-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-bold text-slate-800 leading-none tabular-nums">
          {value.toLocaleString('id-ID')}
        </span>
        <span className="text-[13px] text-slate-400 font-medium">{unit}</span>
      </div>

      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.direction === 'up' ? (
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          ) : trend.direction === 'down' ? (
            <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span
            className={`text-[12px] font-semibold ${
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

      <p className="text-[11px] text-slate-400 mt-2 leading-snug">{description}</p>
    </div>
  );
};
