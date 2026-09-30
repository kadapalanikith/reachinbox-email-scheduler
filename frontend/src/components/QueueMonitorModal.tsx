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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 bg-white border-b border-gray-200 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">BullMQ Dashboard</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  email-dispatch-queue
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Live queue monitoring and job processing</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${BACKEND_URL}/admin/queues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded Bull Board Iframe */}
        <div className="flex-1 w-full bg-white relative">
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
