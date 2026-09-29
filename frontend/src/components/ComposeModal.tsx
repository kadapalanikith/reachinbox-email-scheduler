import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, AlertCircle, Sparkles, Clock, Users, Send } from 'lucide-react';
import { api } from '../services/api';
import { Sender, CsvParseResult } from '../types/index';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(100);

  // CSV parsing state
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [rawTextRecipients, setRawTextRecipients] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch available senders
      api.emails.getSenders().then((list) => {
        setSenders(list);
        if (list.length > 0) {
          const defaultOne = list.find((s) => s.isDefault) || list[0];
          setSelectedSenderId(defaultOne.id);
        }
      });
      // Set default start time to now formatted as datetime-local
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setStartTime(now.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleTextRecipientsBlur = async () => {
    if (!rawTextRecipients.trim()) {
      if (!fileInputRef.current?.files?.length) {
        setCsvResult(null);
      }
      return;
    }
    setIsParsing(true);
    setError(null);
    try {
      const result = await api.emails.parseCsvText(rawTextRecipients);
      setCsvResult(result);
    } catch (err: any) {
      setError('Failed to parse entered emails');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validEmails = csvResult?.validEmails || [];
    if (validEmails.length === 0) {
      setError('Please upload a CSV or enter at least one valid recipient email.');
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
      const payload = {
        subject,
        body,
        recipients: validEmails,
        senderId: selectedSenderId || undefined,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        delayMs: Number(delayMs),
        hourlyLimit: Number(hourlyLimit),
      };

      await api.emails.schedule(payload);
      onSuccess(validEmails.length);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to schedule campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden transition-all animate-scale-up">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Compose New Outreach Campaign</h3>
              <p className="text-xs text-slate-500">Configure parameters, recipients, and timing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sender & Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                From Sender
              </label>
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ? `${s.name} (${s.email})` : s.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Start Time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Rate Limit & Delay Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Delay Between Emails (ms)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">Staggers each consecutive email dispatch</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Hourly Limit (Max/Hour)
              </label>
              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">Overflow emails are rescheduled to next hour</p>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Subject
            </label>
            <input
              type="text"
              placeholder="e.g. Scaling outreach with ReachInbox AI"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Body (HTML / Text supported)
            </label>
            <textarea
              rows={4}
              placeholder="Hi there,&#10;&#10;Excited to share our latest outreach results..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* CSV File Upload or Manual Text */}
          <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs">
                  <Upload className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Recipients CSV / Text</h4>
                  <p className="text-xs text-slate-500">Upload .csv file or paste comma/newline separated emails</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
                >
                  Upload File
                </button>
              </div>
            </div>

            {/* Quick manual paste area */}
            <div className="mt-3">
              <textarea
                rows={2}
                placeholder="Or paste emails directly: john@example.com, jane@example.com"
                value={rawTextRecipients}
                onChange={(e) => setRawTextRecipients(e.target.value)}
                onBlur={handleTextRecipientsBlur}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            {/* Parsing Feedback Badge */}
            {isParsing && (
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Parsing recipients...</span>
              </div>
            )}

            {csvResult && !isParsing && (
              <div className="mt-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-900 font-medium">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>
                    <strong>{csvResult.validEmails.length}</strong> valid email addresses detected
                  </span>
                </div>
                {csvResult.duplicateCount > 0 && (
                  <span className="text-slate-500 font-normal">
                    ({csvResult.duplicateCount} duplicates filtered)
                  </span>
                )}
                {csvResult.invalidEntries.length > 0 && (
                  <span className="text-rose-600 font-medium">
                    ({csvResult.invalidEntries.length} invalid rows omitted)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !csvResult || csvResult.validEmails.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Schedule Campaign ({csvResult?.validEmails.length || 0})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
