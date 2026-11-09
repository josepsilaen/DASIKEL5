import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description }) => {
  return (
    <div>
      <h1 className="text-[24px] sm:text-[27px] font-bold text-slate-900 leading-tight tracking-tight">
        {title}
      </h1>
      <p className="text-[13.5px] sm:text-[14px] text-slate-500 mt-1 leading-relaxed max-w-3xl">
        {description}
      </p>
    </div>
  );
};
