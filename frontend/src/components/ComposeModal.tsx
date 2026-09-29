import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  AlertCircle,
  Send,
  Clock,
  Sparkles,
  FileText,
  Download,
  Info,
  CheckCircle2,
} from 'lucide-react';
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
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [rawTextRecipients, setRawTextRecipients] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!rawTextRecipients.trim()) {
      if (!fileInputRef.current?.files?.length) setCsvResult(null);
      return;
    }
    setIsParsing(true);
    setError(null);
    try {
      const result = await api.emails.parseCsvText(rawTextRecipients);
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

  const insertVariable = (variable: string) => {
    setBody((prev) => `${prev} {{${variable}}}`);
  };

  const validCount = csvResult?.validEmails.length || 0;
  const estimatedSeconds = Math.round((validCount * delayMs) / 1000);
  const estimatedHours = Math.ceil(validCount / hourlyLimit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validEmails = csvResult?.validEmails || [];
    if (validEmails.length === 0) {
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
        recipients: validEmails,
        senderId: selectedSenderId || undefined,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        delayMs: Number(delayMs),
        hourlyLimit: Number(hourlyLimit),
      });
      onSuccess(validEmails.length);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to schedule campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150';
  const labelCls = 'block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[4vh] bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl animate-scale-up mb-6 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Sparkles className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">New Outreach Campaign</h3>
              <p className="text-xs text-slate-500">Configure queue rate-limiting, timing & recipients</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Dispatch Pipeline Configuration */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Queue & Rate Limiting Parameters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Sending Account</label>
                <select
                  value={selectedSenderId}
                  onChange={(e) => setSelectedSenderId(e.target.value)}
                  className={inputCls + ' cursor-pointer'}
                >
                  {senders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name ? `${s.name} (${s.email})` : s.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Schedule Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Delay Between Emails (ms)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className={inputCls}
                />
                <p className="text-[11px] text-slate-400 mt-1">Staggers dispatch to protect sender reputation</p>
              </div>

              <div>
                <label className={labelCls}>Hourly Rate Limit</label>
                <input
                  type="number"
                  min="1"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className={inputCls}
                />
                <p className="text-[11px] text-slate-400 mt-1">Surplus deferred to subsequent hour window</p>
              </div>
            </div>
          </div>

          {/* Section 2: Subject & Body */}
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Email Subject</label>
              <input
                type="text"
                placeholder="e.g. Scaling distributed outreach with BullMQ & Elasticsearch"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls + ' mb-0'}>Email Body (HTML / Markdown)</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Insert tag:</span>
                  {['firstName', 'company'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertVariable(tag)}
                      className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                    >
                      {`{{${tag}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={4}
                placeholder="Hi {{firstName}},&#10;&#10;I wanted to share how ReachInbox coordinates distributed email dispatch..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={inputCls + ' resize-none font-sans'}
              />
            </div>
          </div>

          {/* Section 3: Recipient List & Upload */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-4 transition-all duration-150 ${
              isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs">
                  <FileText className="w-4 h-4 stroke-[1.75]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Recipients Ingestion</h4>
                  <p className="text-[11px] text-slate-500">Drag & drop CSV, or paste emails separated by commas</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  title="Download Sample CSV Template"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sample CSV</span>
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Browse CSV
                </button>
              </div>
            </div>

            <textarea
              rows={2}
              placeholder="Or enter recipient emails: alex@acme.com, sarah@tech.org, michael@dunder.com"
              value={rawTextRecipients}
              onChange={(e) => setRawTextRecipients(e.target.value)}
              onBlur={handleTextRecipientsBlur}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />

            {isParsing && (
              <div className="mt-2.5 flex items-center gap-2 text-xs text-indigo-600 font-medium">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                Validating and parsing recipients...
              </div>
            )}

            {csvResult && !isParsing && (
              <div className="mt-3 p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-indigo-800 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    {csvResult.validEmails.length} valid recipient{csvResult.validEmails.length !== 1 ? 's' : ''}
                  </span>
                  {csvResult.duplicateCount > 0 && (
                    <span className="text-slate-500">({csvResult.duplicateCount} duplicates purged)</span>
                  )}
                  {csvResult.invalidEntries.length > 0 && (
                    <span className="text-red-600 font-medium">
                      ({csvResult.invalidEntries.length} invalid addresses rejected)
                    </span>
                  )}
                </div>

                {/* Dispatch calculation estimate */}
                {validCount > 0 && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-indigo-100/60 font-medium">
                    <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span>
                      Estimated run: ~{estimatedSeconds < 60 ? `${estimatedSeconds}s` : `${Math.ceil(estimatedSeconds / 60)} min`}{' '}
                      at {delayMs}ms stagger across {estimatedHours} hour window{estimatedHours !== 1 ? 's' : ''}.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !csvResult || csvResult.validEmails.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Queuing in BullMQ...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Schedule {validCount ? `${validCount} Email${validCount !== 1 ? 's' : ''}` : 'Campaign'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
