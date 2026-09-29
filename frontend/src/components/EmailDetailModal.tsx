import React from 'react';
import { X, Mail, Clock, Calendar, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { EmailItem } from '../types/index';

interface EmailDetailModalProps {
  email: EmailItem | null;
  onClose: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  const isSent = email.status === 'SENT';
  const isFailed = email.status === 'FAILED';
  const isScheduled = email.status === 'SCHEDULED';
  const isProcessing = email.status === 'PROCESSING';

  const formatFullDate = (ts: string | null) => {
    if (!ts) return 'Not available';
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'medium',
      }).format(new Date(ts));
    } catch {
      return ts;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-scale-up overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Mail className="w-4.5 h-4.5 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Email Details</h3>
              <p className="text-xs text-slate-500 font-mono truncate max-w-xs">{email.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              isSent
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                : isFailed
                ? 'bg-red-50/80 border-red-200 text-red-800'
                : isProcessing
                ? 'bg-amber-50/80 border-amber-200 text-amber-800'
                : 'bg-indigo-50/80 border-indigo-200 text-indigo-800'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              {isSent && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {isFailed && <AlertTriangle className="w-4 h-4 text-red-600" />}
              {isScheduled && <Calendar className="w-4 h-4 text-indigo-600" />}
              {isProcessing && <Clock className="w-4 h-4 text-amber-600 animate-spin" />}
              <span>Status: {email.status}</span>
            </div>
            {email.etherealPreviewUrl && (
              <a
                href={email.etherealPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer shadow-xs"
              >
                View in Mailbox
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Key metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div>
              <span className="text-slate-400 font-medium block">Recipient</span>
              <span className="font-semibold text-slate-800 font-mono text-sm break-all">{email.recipient}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Sender</span>
              <span className="font-semibold text-slate-800 font-mono text-sm break-all">
                {email.sender?.email || 'System Default'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Scheduled For</span>
              <span className="text-slate-700 font-medium">{formatFullDate(email.scheduledAt)}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Sent At</span>
              <span className="text-slate-700 font-medium">{formatFullDate(email.sentAt)}</span>
            </div>
          </div>

          {/* Failure message if any */}
          {email.errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-red-600 block">Dispatch Error</span>
              <p className="font-mono text-xs">{email.errorMessage}</p>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Subject</label>
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900">
              {email.subject}
            </div>
          </div>

          {/* Body Content */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Email Body</label>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {email.body}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
