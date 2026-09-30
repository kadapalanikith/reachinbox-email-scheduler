import React from 'react';
import { ArrowLeft, ExternalLink, Activity, Server, Clock, ShieldCheck } from 'lucide-react';
import { BACKEND_URL } from '../services/api';

interface QueueDashboardViewProps {
  onBack: () => void;
}

export const QueueDashboardView: React.FC<QueueDashboardViewProps> = ({ onBack }) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 min-h-0">
      {/* ── ReachInbox Page Header / Wrapper ── */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">BullMQ Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              email-dispatch-queue
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Live queue monitoring and job processing</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gray-500" />
            <span>Back to Dashboard</span>
          </button>

          <a
            href={`${BACKEND_URL}/admin/queues`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Open in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* ── Main Area with Light Wrapper ── */}
      <div className="flex-1 p-4 sm:p-6 flex flex-col min-h-0">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs flex flex-col min-h-0">
          {/* Subtle Telemetry Strip */}
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-green-600" />
              <span className="font-semibold text-gray-800">Bull Board Live Telemetry</span>
              <span className="text-gray-300">|</span>
              <span className="font-mono text-gray-600">email-dispatch-queue</span>
            </div>
            <div className="hidden md:flex items-center gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <Server className="w-3 h-3 text-gray-400" /> Concurrency: 10
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" /> Min Delay: 2000ms
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-gray-400" /> Rate Limit: 100/hr
              </span>
            </div>
          </div>

          {/* Embedded Native Bull Board Dashboard */}
          <div className="flex-1 w-full bg-white relative min-h-[580px]">
            <iframe
              src={`${BACKEND_URL}/admin/queues`}
              title="Bull Board Queue Monitor"
              className="w-full h-full border-0 absolute inset-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
