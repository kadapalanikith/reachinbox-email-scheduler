import React, { useState } from 'react';
import { ExternalLink, Clock, AlertTriangle, Eye } from 'lucide-react';
import { EmailItem } from '../types/index';
import { EmailDetailModal } from './EmailDetailModal';

interface EmailTableProps {
  type: 'scheduled' | 'sent';
  emails: EmailItem[];
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variants: Record<string, string> = {
    SENT: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    SCHEDULED: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200/80',
    FAILED: 'bg-red-50 text-red-700 border-red-200/80',
  };
  const dotVariants: Record<string, string> = {
    SENT: 'bg-emerald-500',
    SCHEDULED: 'bg-indigo-500',
    PROCESSING: 'bg-amber-500 animate-pulse',
    FAILED: 'bg-red-500',
  };
  const cls = variants[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  const dot = dotVariants[status] || 'bg-slate-400';
  const label = status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
};

const formatTs = (dateStr: string | null) => {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};

export const EmailTable: React.FC<EmailTableProps> = ({ type, emails }) => {
  const isScheduled = type === 'scheduled';
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-5">Recipient</th>
                <th className="py-3 px-5">Subject</th>
                <th className="py-3 px-5 whitespace-nowrap">
                  {isScheduled ? 'Scheduled Dispatch' : 'Delivered Time'}
                </th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {emails.map((email) => (
                <tr
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className="hover:bg-indigo-50/30 transition-colors duration-150 cursor-pointer group"
                >
                  {/* Recipient */}
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {email.recipient}
                    </div>
                    {email.sender && (
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        via {email.sender.email}
                      </div>
                    )}
                  </td>

                  {/* Subject */}
                  <td className="py-3.5 px-5 max-w-xs sm:max-w-md">
                    <div className="text-slate-700 truncate font-medium">{email.subject}</div>
                    {email.errorMessage && (
                      <div className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{email.errorMessage}</span>
                      </div>
                    )}
                  </td>

                  {/* Timestamp */}
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                      <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" aria-hidden="true" />
                      {isScheduled ? formatTs(email.scheduledAt) : formatTs(email.sentAt)}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <StatusBadge status={email.status} />
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedEmail(email)}
                        title="View Details"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Details</span>
                      </button>

                      {!isScheduled && email.etherealPreviewUrl && (
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold rounded-lg border border-indigo-100 transition-colors cursor-pointer"
                        >
                          <span>Preview</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email detail inspection modal */}
      <EmailDetailModal email={selectedEmail} onClose={() => setSelectedEmail(null)} />
    </>
  );
};
