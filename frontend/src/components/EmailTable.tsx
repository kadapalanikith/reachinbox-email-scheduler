import React from 'react';
import { ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { EmailItem } from '../types/index';

interface EmailTableProps {
  type: 'scheduled' | 'sent';
  emails: EmailItem[];
  emptyMessage?: string;
}

export const EmailTable: React.FC<EmailTableProps> = ({ type, emails }) => {
  const isScheduledTab = type === 'scheduled';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Sent
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Scheduled
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Processing
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatTimestamp = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-5">Recipient</th>
              <th className="py-3.5 px-5">Subject</th>
              <th className="py-3.5 px-5">{isScheduledTab ? 'Scheduled Time' : 'Sent Time'}</th>
              <th className="py-3.5 px-5">Status</th>
              {!isScheduledTab && <th className="py-3.5 px-5 text-right">Ethereal Preview</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {emails.map((email) => (
              <tr key={email.id} className="hover:bg-slate-50/60 transition-colors">
                {/* Recipient */}
                <td className="py-4 px-5">
                  <div className="font-medium text-slate-900">{email.recipient}</div>
                  {email.sender && (
                    <div className="text-xs text-slate-400">from: {email.sender.email}</div>
                  )}
                </td>

                {/* Subject */}
                <td className="py-4 px-5">
                  <div className="text-slate-800 font-normal max-w-xs sm:max-w-md truncate">
                    {email.subject}
                  </div>
                  {email.errorMessage && (
                    <div className="flex items-center gap-1 text-xs text-rose-500 mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{email.errorMessage}</span>
                    </div>
                  )}
                </td>

                {/* Time */}
                <td className="py-4 px-5 whitespace-nowrap text-slate-600 font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {isScheduledTab ? formatTimestamp(email.scheduledAt) : formatTimestamp(email.sentAt)}
                  </div>
                </td>

                {/* Status */}
                <td className="py-4 px-5 whitespace-nowrap">
                  {getStatusBadge(email.status)}
                </td>

                {/* Preview Link for Sent Tab */}
                {!isScheduledTab && (
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    {email.etherealPreviewUrl ? (
                      <a
                        href={email.etherealPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        View Email
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300 font-mono">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
