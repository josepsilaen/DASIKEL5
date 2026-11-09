import React from 'react';

interface ChartPanelProps {
  title: string;
  description?: string;
  badge?: string;
  isSynthetic?: boolean;
  footerNote?: string;
  children: React.ReactNode;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({
  title,
  description,
  badge,
  isSynthetic,
  footerNote,
  children,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
      <div>
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-[16px] sm:text-[17px] font-bold text-slate-800 tracking-tight">
              {title}
            </h3>
            {(badge || isSynthetic) && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0"
                title="Visualisasi ini merupakan ilustrasi pengujian antarmuka"
              >
                {badge || 'Data Contoh'}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[12.5px] sm:text-[13px] text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        <div className="w-full">{children}</div>
      </div>

      {footerNote && (
        <p className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400 italic text-right">
          {footerNote}
        </p>
      )}
    </div>
  );
};
