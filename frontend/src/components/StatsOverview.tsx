import React from 'react';
import { CalendarClock, CheckCircle2, Gauge, Users, TrendingUp } from 'lucide-react';

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
  const totalEmails = scheduledCount + sentCount;
  const deliveryRate = totalEmails > 0 ? Math.round((sentCount / totalEmails) * 100) : 100;
  const rateLimitUsage = Math.min(Math.round((sentCount % hourlyLimit) / hourlyLimit * 100), 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Scheduled Card */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              BullMQ Queue
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{scheduledCount}</span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                Pending
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              Delayed dispatch queue
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs flex-shrink-0 group-hover:scale-110 transition-transform">
            <CalendarClock className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* 2. Sent Card */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Dispatched
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{sentCount}</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                {deliveryRate}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Delivered via SMTP</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs flex-shrink-0 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* 3. Rate Limit Meter */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Rate Limit Throttling
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{hourlyLimit}</span>
              <span className="text-xs font-medium text-slate-400">/hr per sender</span>
            </div>
            {/* Meter Bar */}
            <div className="mt-2">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(rateLimitUsage, 8)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Sliding 1-hour window</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs flex-shrink-0 group-hover:scale-110 transition-transform">
            <Gauge className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* 4. Active Senders */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-cyan-600" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Sender Inboxes
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{activeSenders}</span>
              <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-100">
                Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Round-robin load balanced</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shadow-xs flex-shrink-0 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>
    </div>
  );
};
