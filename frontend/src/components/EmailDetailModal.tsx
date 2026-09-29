import React from 'react';
import { ArrowLeft, Star, ExternalLink, AlertTriangle } from 'lucide-react';
import { EmailItem } from '../types/index';

interface EmailDetailModalProps {
  email: EmailItem | null;
  onClose: () => void;
}

const formatFullDate = (ts: string | null): string => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${months[d.getMonth()]} ${d.getDate()}, ${hours}:${mins} ${ampm}`;
  } catch {
    return ts;
  }
};

const getInitial = (email: string): string => {
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase();
};

const getRecipientName = (email: string): string => {
  const local = email.split('@')[0];
  return local
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
};

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  const recipientName = getRecipientName(email.recipient);
  const senderEmail = email.sender?.email || email.recipient;
  const senderName = email.sender?.name || getRecipientName(senderEmail);
  const dateDisplay = formatFullDate(email.sentAt || email.scheduledAt);
  const initial = getInitial(senderEmail);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {/* Email subject as title */}
          <h1 className="text-sm font-semibold text-gray-800 truncate max-w-lg">
            {recipientName ? `${recipientName.split(' ')[0]}, hello there!` : email.subject}{' '}
            <span className="font-mono text-xs text-gray-400 ml-1">
              | {email.id.slice(0, 12).toUpperCase()}
            </span>
          </h1>
        </div>
        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            <Star className="w-4 h-4" />
          </button>
          {email.etherealPreviewUrl && (
            <a
              href={email.etherealPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
              title="Open in mailbox"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {/* User avatar */}
          <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initial}
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl w-full mx-auto">
        {/* Sender info row */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
              {initial}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{senderName}</span>
                <span className="text-xs text-gray-400">&lt;{senderEmail}&gt;</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">to me</div>
            </div>
          </div>
          <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-1">
            {dateDisplay}
          </div>
        </div>

        {/* Status banner if failed */}
        {email.status === 'FAILED' && email.errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Delivery Failed</span>
              <span className="text-xs">{email.errorMessage}</span>
            </div>
          </div>
        )}

        {/* Email body */}
        <div
          className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: 'inherit' }}
        >
          {email.body ? (
            // If body looks like HTML, render it; otherwise render as text
            email.body.trim().startsWith('<') ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: email.body }}
              />
            ) : (
              email.body
            )
          ) : (
            <span className="text-gray-400 italic">No email body available.</span>
          )}
        </div>

        {/* Metadata footer */}
        <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-gray-400">
          <div>
            <span className="font-medium text-gray-500 block mb-0.5">To</span>
            <span className="text-gray-700 font-mono">{email.recipient}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500 block mb-0.5">From</span>
            <span className="text-gray-700 font-mono">{senderEmail}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500 block mb-0.5">Subject</span>
            <span className="text-gray-700">{email.subject}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500 block mb-0.5">Status</span>
            <span className={`font-medium ${
              email.status === 'SENT' ? 'text-green-600' :
              email.status === 'FAILED' ? 'text-red-600' :
              email.status === 'PROCESSING' ? 'text-amber-600' :
              'text-gray-600'
            }`}>
              {email.status.charAt(0) + email.status.slice(1).toLowerCase()}
            </span>
          </div>
          {email.scheduledAt && (
            <div>
              <span className="font-medium text-gray-500 block mb-0.5">Scheduled</span>
              <span className="text-gray-700">{formatFullDate(email.scheduledAt)}</span>
            </div>
          )}
          {email.sentAt && (
            <div>
              <span className="font-medium text-gray-500 block mb-0.5">Delivered</span>
              <span className="text-gray-700">{formatFullDate(email.sentAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
