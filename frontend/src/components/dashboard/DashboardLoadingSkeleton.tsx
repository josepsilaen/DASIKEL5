import React from 'react';

export const DashboardLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-7 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-96 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-32 bg-slate-100 rounded-lg" />
      </div>

      {/* Banner Skeleton */}
      <div className="h-24 bg-slate-100 border border-slate-200 rounded-xl" />

      {/* 4 Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs">
            <div className="h-4 w-28 bg-slate-100 rounded" />
            <div className="h-8 w-20 bg-slate-200 rounded-lg" />
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Visualizations Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <div className="h-80 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="h-5 w-44 bg-slate-200 rounded" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
          <div className="h-52 bg-slate-50 rounded-lg" />
        </div>
        <div className="h-80 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="h-5 w-44 bg-slate-200 rounded" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
          <div className="h-52 bg-slate-50 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

