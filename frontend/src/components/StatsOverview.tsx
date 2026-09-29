import React from 'react';
import { CalendarClock, CheckCircle, Gauge, Activity } from 'lucide-react';

interface StatsOverviewProps {
  scheduledCount: number;
  sentCount: number;
  hourlyLimit: number;
  activeSenders: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  scheduledCount,
  sentCount,
  hourlyLimit,
  activeSenders,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Scheduled Metric */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <CalendarClock className="w-6 h-6 stroke-[1.75]" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scheduled</p>
          <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{scheduledCount}</h4>
        </div>
      </div>

      {/* Sent Metric */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle className="w-6 h-6 stroke-[1.75]" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sent Successfully</p>
          <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{sentCount}</h4>
        </div>
      </div>

      {/* Rate Limit Cap */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <Gauge className="w-6 h-6 stroke-[1.75]" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rate Limit Cap</p>
          <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{hourlyLimit}<span className="text-xs font-medium text-slate-400"> /hr</span></h4>
        </div>
      </div>

      {/* Senders / Dispatch Status */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Activity className="w-6 h-6 stroke-[1.75]" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Senders</p>
          <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{activeSenders}</h4>
        </div>
      </div>
    </div>
  );
};
