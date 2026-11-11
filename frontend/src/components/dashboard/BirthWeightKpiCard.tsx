import React from 'react';
import { Scale, AlertTriangle, Info } from 'lucide-react';

interface BirthWeightKpiCardProps {
  title: string;
  value: string;
  countLabel: string;
  description: string;
  variant?: 'blue' | 'red';
  badgeText?: string;
}

export const BirthWeightKpiCard: React.FC<BirthWeightKpiCardProps> = ({
  title,
  value,
  countLabel,
  description,
  variant = 'blue',
  badgeText,
}) => {
  const isRed = variant === 'red';

  return (
    <div
      className={`rounded-xl border p-5 shadow-xs transition-all ${
        isRed
          ? 'bg-rose-50/40 border-rose-200/90'
          : 'bg-blue-50/40 border-blue-200/90'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-lg ${
              isRed
                ? 'bg-rose-100 text-rose-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isRed ? <AlertTriangle className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {title}
          </h3>
        </div>
        {badgeText && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isRed
                ? 'bg-rose-100 text-rose-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-3 my-1">
        <span
          className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
            isRed ? 'text-rose-600' : 'text-blue-600'
          }`}
        >
          {value}
        </span>
        <span className="text-xs font-medium text-slate-600">
          {countLabel}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <p className="line-clamp-2 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

