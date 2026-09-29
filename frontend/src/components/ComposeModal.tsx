import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Send,
  AlertCircle,
  Upload,
  Download,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { Sender, CsvParseResult } from '../types/index';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

// Quick time options for Send Later popup
const QUICK_TIMES = [
  { label: 'Tomorrow' },
  { label: 'Tomorrow, 10:00 AM' },
  { label: 'Tomorrow, 11:00 AM' },
  { label: 'Tomorrow, 3:00 PM' },
];

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayMs, setDelayMs] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [rawTextRecipients, setRawTextRecipients] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSendLater, setShowSendLater] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendLaterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      api.emails.getSenders().then((list) => {
        setSenders(list);
        if (list.length > 0) {
          const defaultOne = list.find((s) => s.isDefault) || list[0];
          setSelectedSenderId(defaultOne.id);
        }
      });
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setStartTime(now.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  // Close send-later popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sendLaterRef.current && !sendLaterRef.current.contains(e.target as Node)) {
        setShowSendLater(false);
      }
    };
    if (showSendLater) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSendLater]);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setIsParsing(true);
    setError(null);
    try {
      const result = await api.emails.parseCsvFile(file);
      setCsvResult(result);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to parse CSV file');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleTextRecipientsBlur = async () => {
    const combined = [recipientEmail, rawTextRecipients].filter(Boolean).join(', ');
    if (!combined.trim()) {
      if (!fileInputRef.current?.files?.length) setCsvResult(null);
      return;
    }
    setIsParsing(true);
    setError(null);
    try {
      const result = await api.emails.parseCsvText(combined);
      setCsvResult(result);
    } catch {
      setError('Failed to parse entered emails');
    } finally {
      setIsParsing(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'email,firstName,company\nalex.turner@example.com,Alex,Acme Corp\nsarah.connor@example.com,Sarah,Cyberdyne\nmichael.scott@example.com,Michael,Dunder Mifflin';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_recipients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validCount = csvResult?.validEmails.length || 0;
  const estimatedSeconds = Math.round((validCount * delayMs * 1000) / 1000);
  const estimatedHours = Math.ceil(validCount / hourlyLimit);

  const handleSend = async (scheduledAt?: string) => {
    setError(null);
    const validEmails = csvResult?.validEmails || [];

    // If no CSV recipients, try single recipient field
    let finalRecipients = validEmails;
    if (finalRecipients.length === 0 && recipientEmail.trim()) {
      const emails = recipientEmail
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));
      finalRecipients = emails;
    }

    if (finalRecipients.length === 0) {
      setError('Please add at least one valid recipient email.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!body.trim()) {
      setError('Email body is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.emails.schedule({
        subject,
        body,
        recipients: finalRecipients,
        senderId: selectedSenderId || undefined,
        startTime: scheduledAt || (startTime ? new Date(startTime).toISOString() : undefined),
        delayMs: Number(delayMs) * 1000,
        hourlyLimit: Number(hourlyLimit),
      });
      onSuccess(finalRecipients.length);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to schedule campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickTime = (label: string) => {
    const now = new Date();
    let target = new Date();
    if (label.includes('10:00')) {
      target.setDate(now.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (label.includes('11:00')) {
      target.setDate(now.getDate() + 1);
      target.setHours(11, 0, 0, 0);
    } else if (label.includes('3:00') || label.includes('15:00')) {
      target.setDate(now.getDate() + 1);
      target.setHours(15, 0, 0, 0);
    } else {
      // Tomorrow default — noon
      target.setDate(now.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    }
    setStartTime(target.toISOString().slice(0, 16));
    setShowSendLater(false);
  };


  const fieldCls =
    'w-full px-0 py-2 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent border-b border-gray-200 focus:outline-none focus:border-green-500 transition-colors';
  const labelCls = 'w-16 flex-shrink-0 text-sm text-gray-500';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-gray-800">Compose New Email</h1>
        </div>
        <div className="flex items-center gap-3 relative">
          {/* Attachment icon */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            title="Attach file / Upload CSV"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Clock / Send Later icon */}
          <button
            type="button"
            onClick={() => setShowSendLater(!showSendLater)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            title="Send Later"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Send button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Send
          </button>

          {/* Send Later Popup */}
          {showSendLater && (
            <div
              ref={sendLaterRef}
              className="absolute top-10 right-0 z-10 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4"
            >
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Send Later</h3>

              {/* Date picker */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                  placeholder="Pick date & time"
                />
                <span className="text-gray-400 text-xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </span>
              </div>

              {/* Quick time options */}
              <div className="space-y-0.5 mb-4">
                {QUICK_TIMES.map((qt) => (
                  <button
                    key={qt.label}
                    type="button"
                    onClick={() => handleQuickTime(qt.label)}
                    className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  >
                    {qt.label}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowSendLater(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (customDate) {
                      setStartTime(customDate);
                    }
                    setShowSendLater(false);
                    handleSend(customDate ? new Date(customDate).toISOString() : undefined);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* From */}
          <div className="flex items-center border-b border-gray-100 py-2">
            <label className={labelCls}>From</label>
            <div className="flex-1">
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="w-auto max-w-xs text-sm text-gray-700 bg-transparent border-0 focus:outline-none cursor-pointer pr-6 appearance-none"
                style={{ backgroundImage: 'none' }}
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ? `${s.name} (${s.email})` : s.email}
                  </option>
                ))}
              </select>
              {/* Custom dropdown display */}
              {senders.length === 0 && (
                <span className="text-sm text-gray-400">Loading senders...</span>
              )}
            </div>
          </div>

          {/* To */}
          <div className="flex items-center border-b border-gray-100 py-2">
            <label className={labelCls}>To</label>
            <input
              type="text"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              onBlur={handleTextRecipientsBlur}
              className={fieldCls}
            />
          </div>

          {/* Subject */}
          <div className="flex items-center border-b border-gray-100 py-2">
            <label className={labelCls}>Subject</label>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={fieldCls}
            />
          </div>

          {/* Delay + Hourly Limit */}
          <div className="flex items-center gap-6 border-b border-gray-100 py-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">Delay between 2 emails</label>
              <input
                type="number"
                min="0"
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="w-14 px-2 py-1 text-sm text-center border border-gray-200 rounded-lg focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Hourly Limit</label>
              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-14 px-2 py-1 text-sm text-center border border-gray-200 rounded-lg focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-500/20"
              />
            </div>
          </div>

          {/* Body / rich text area */}
          <div className="mt-4">
            <textarea
              rows={8}
              placeholder="Type Your Reply..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-0 py-2 text-sm text-gray-700 placeholder:text-gray-400 bg-transparent border-0 focus:outline-none resize-none leading-relaxed"
            />

            {/* Toolbar row (decorative - matches Figma) */}
            <div className="flex items-center gap-1 pt-2 border-t border-gray-100 text-gray-400">
              {/* Undo */}
              <button type="button" className="p-1 hover:text-gray-600 cursor-pointer" title="Undo">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
              </button>
              {/* Redo */}
              <button type="button" className="p-1 hover:text-gray-600 cursor-pointer" title="Redo">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
              </button>
              <span className="w-px h-4 bg-gray-200 mx-1" />
              {/* Heading */}
              <button type="button" className="p-1 hover:text-gray-600 cursor-pointer text-xs font-bold">T↕</button>
              {/* Bold */}
              <button type="button" className="p-1 hover:text-gray-600 cursor-pointer font-bold text-sm">B</button>
              {/* Italic */}
              <button type="button" className="p-1 hover:text-gray-600 cursor-pointer italic text-sm">I</button>
              {/* Underline */}
              <button type="button" className="p-1 hover:text-gray-600 cursor-pointer underline text-sm">U</button>
              <span className="w-px h-4 bg-gray-200 mx-1" />
              {/* Align */}
              <button type="button" className="p-1 hover:text-gray-600 cursor-pointer">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
              </button>
              {/* Bullet list */}
              <button type="button" className="p-1 hover:text-gray-600 cursor-pointer">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/></svg>
              </button>
              {/* Insert variable tags */}
              <span className="w-px h-4 bg-gray-200 mx-1" />
              <button
                type="button"
                onClick={() => setBody((b) => `${b} {{firstName}}`)}
                className="px-1.5 py-0.5 text-[11px] font-mono hover:bg-gray-100 rounded cursor-pointer"
                title="Insert firstName"
              >
                {'{{firstName}}'}
              </button>
              <button
                type="button"
                onClick={() => setBody((b) => `${b} {{company}}`)}
                className="px-1.5 py-0.5 text-[11px] font-mono hover:bg-gray-100 rounded cursor-pointer"
                title="Insert company"
              >
                {'{{company}}'}
              </button>
            </div>
          </div>

          {/* Recipient Upload Section */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Upload Recipient List</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Sample CSV
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Browse CSV
                </button>
              </div>
            </div>

            {/* Drag & drop zone + text input */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
                isDragging ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <textarea
                rows={2}
                placeholder="Or paste recipient emails: alex@acme.com, sarah@tech.org ..."
                value={rawTextRecipients}
                onChange={(e) => setRawTextRecipients(e.target.value)}
                onBlur={handleTextRecipientsBlur}
                className="w-full text-xs text-gray-700 placeholder:text-gray-400 bg-transparent border-0 focus:outline-none resize-none"
              />
            </div>

            {isParsing && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-600 font-medium">
                <div className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                Validating recipients...
              </div>
            )}

            {csvResult && !isParsing && (
              <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl space-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-green-800 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    {csvResult.validEmails.length} valid recipient{csvResult.validEmails.length !== 1 ? 's' : ''}
                  </span>
                  {csvResult.duplicateCount > 0 && (
                    <span className="text-gray-500">({csvResult.duplicateCount} duplicates removed)</span>
                  )}
                  {csvResult.invalidEntries.length > 0 && (
                    <span className="text-red-600">({csvResult.invalidEntries.length} invalid)</span>
                  )}
                </div>
                {validCount > 0 && (
                  <div className="text-gray-500 flex items-center gap-1.5 pt-1 border-t border-green-100">
                    <Info className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span>
                      Est. ~{estimatedSeconds < 60 ? `${estimatedSeconds}s` : `${Math.ceil(estimatedSeconds / 60)}m`} at {delayMs}s stagger across {estimatedHours} hour window{estimatedHours !== 1 ? 's' : ''}.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
