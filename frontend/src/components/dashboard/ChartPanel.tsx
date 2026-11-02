import React from 'react';

interface ChartPanelProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
        {description && (
          <p className="text-[12px] text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
};
