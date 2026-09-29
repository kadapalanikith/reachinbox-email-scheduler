import React from 'react';

interface TableLoadingSkeletonProps {
  rows?: number;
}

export const TableLoadingSkeleton: React.FC<TableLoadingSkeletonProps> = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex gap-8">
        {['w-28', 'w-48', 'w-32', 'w-20'].map((w, i) => (
          <div key={i} className={`h-3 ${w} bg-slate-200 rounded animate-pulse`} />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-8" style={{ opacity: 1 - i * 0.15 }}>
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 bg-slate-200 rounded animate-pulse w-40" />
              <div className="h-2.5 bg-slate-100 rounded animate-pulse w-28" />
            </div>
            <div className="h-3 bg-slate-200 rounded animate-pulse w-52" />
            <div className="h-3 bg-slate-200 rounded animate-pulse w-28" />
            <div className="h-6 bg-slate-200 rounded-full animate-pulse w-20" />
          </div>
        ))}
      </div>
    </div>
  );
};
