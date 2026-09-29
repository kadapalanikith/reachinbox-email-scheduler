import React from 'react';
import { X, ExternalLink, Activity } from 'lucide-react';
import { BACKEND_URL } from '../services/api';

interface QueueMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueMonitorModal: React.FC<QueueMonitorModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">BullMQ Queue Telemetry</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Real-time Bull Board queue metrics & job state machine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${BACKEND_URL}/admin/queues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded Bull Board Iframe */}
        <div className="flex-1 w-full bg-[#181d25] relative">
          <iframe
            src={`${BACKEND_URL}/admin/queues`}
            title="Bull Board Queue Monitor"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
