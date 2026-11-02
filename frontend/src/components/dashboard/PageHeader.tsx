import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description }) => {
  return (
    <div className="mb-6">
      <h1 className="text-[26px] font-bold text-slate-800 leading-tight">
        {title}
      </h1>
      <p className="text-[14px] text-slate-500 mt-1 leading-relaxed max-w-2xl">
        {description}
      </p>
    </div>
  );
};
