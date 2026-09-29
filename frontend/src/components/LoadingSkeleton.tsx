import React from 'react';

export const TableLoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="h-5 bg-slate-200 rounded-md w-36 animate-pulse" />
        <div className="h-8 bg-slate-100 rounded-lg w-24 animate-pulse" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3 w-1/3">
              <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
              <div className="space-y-1.5 w-full">
                <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 rounded-md w-1/2" />
              </div>
            </div>
            <div className="h-4 bg-slate-100 rounded-md w-1/4 hidden sm:block" />
            <div className="h-4 bg-slate-100 rounded-md w-1/6" />
            <div className="h-6 bg-slate-100 rounded-full w-20" />
          </div>
        ))}
      </div>
    </div>
  );
};
