import React, { useState } from 'react';
import { EmailItem } from '../types/index';
import { EmailDetailModal } from './EmailDetailModal';

interface EmailListViewProps {
  type: 'scheduled' | 'sent';
  emails: EmailItem[];
  loading: boolean;
  onCompose: () => void;
}

const formatScheduledTs = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[d.getDay()];
    let hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${dayName} ${hours}:${mins} ${ampm}`;
  } catch {
    return dateStr;
  }
};


// Strip HTML tags for preview text
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const getRecipientName = (email: string): string => {
  // Convert email to a human-readable name
  const local = email.split('@')[0];
  return local
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
};

export const EmailListView: React.FC<EmailListViewProps> = ({ type, emails, loading, onCompose }) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const isScheduled = type === 'scheduled';

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100 animate-pulse">
            <div className="w-24 h-4 bg-gray-100 rounded" />
            <div className="w-32 h-4 bg-gray-100 rounded" />
            <div className="flex-1 h-4 bg-gray-100 rounded" />
            <div className="w-4 h-4 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {isScheduled ? (
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </div>
        <p className="text-sm font-medium text-gray-600 mb-1">
          {isScheduled ? 'No scheduled emails' : 'No sent emails yet'}
        </p>
        <p className="text-xs text-gray-400 mb-4">
          {isScheduled
            ? 'Compose a new email to schedule your first campaign.'
            : 'Dispatched emails will appear here.'}
        </p>
        {isScheduled && (
          <button
            onClick={onCompose}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Compose Email
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-gray-100">
        {emails.map((email) => {
          const recipientName = getRecipientName(email.recipient);
          const bodyPreview = stripHtml(email.body).slice(0, 80);

          return (
            <div
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors group"
            >
              {/* Recipient */}
              <div className="w-28 flex-shrink-0">
                <span className="text-sm font-medium text-gray-800 truncate block">
                  To: {recipientName}
                </span>
              </div>

              {/* Schedule/Status badge + Subject + Preview */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                {/* Time badge for scheduled / "Sent" label for sent */}
                {isScheduled ? (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full text-[11px] font-medium text-orange-600 whitespace-nowrap">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {formatScheduledTs(email.scheduledAt)}
                  </span>
                ) : (
                  <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-full text-[11px] font-medium text-gray-500 whitespace-nowrap">
                    Sent
                  </span>
                )}

                {/* Subject */}
                <span className="text-sm font-semibold text-gray-800 truncate flex-shrink-0 max-w-[160px]">
                  {email.subject}
                </span>

                {/* Separator + preview */}
                <span className="text-gray-300 flex-shrink-0">–</span>
                <span className="text-sm text-gray-400 truncate min-w-0">
                  {bodyPreview || 'No preview available'}
                </span>
              </div>

              {/* Star / action */}
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 p-1 text-gray-300 hover:text-yellow-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                title="Star"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Email detail modal */}
      <EmailDetailModal email={selectedEmail} onClose={() => setSelectedEmail(null)} />
    </>
  );
};
