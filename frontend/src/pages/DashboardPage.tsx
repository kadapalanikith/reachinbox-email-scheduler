import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, CalendarClock, CheckCircle, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { StatsOverview } from '../components/StatsOverview';
import { EmailTable } from '../components/EmailTable';
import { ComposeModal } from '../components/ComposeModal';
import { SlackModal } from '../components/SlackModal';
import { EmptyState } from '../components/EmptyState';
import { TableLoadingSkeleton } from '../components/LoadingSkeleton';
import { Toast } from '../components/Toast';
import { EmailItem, SlackStatus } from '../types/index';
import { api } from '../services/api';
import { useSearchParams } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmailItem[] | null>(null);
  const [searchSource, setSearchSource] = useState<string | null>(null);

  // Modals state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const fetchSlackStatus = useCallback(async () => {
    try {
      const status = await api.slack.getStatus();
      setSlackStatus(status);
    } catch {
      // Ignored
    }
  }, []);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [schedRes, sentRes] = await Promise.all([
        api.emails.getScheduled(1, 50),
        api.emails.getSent(1, 50),
      ]);

      setScheduledEmails(schedRes.emails);
      setTotalScheduled(schedRes.total);

      setSentEmails(sentRes.emails);
      setTotalSent(sentRes.total);
    } catch (err: any) {
      console.error('Failed to load email lists', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load & periodic polling to observe delayed jobs transitioning
  useEffect(() => {
    fetchData();
    fetchSlackStatus();

    // Check for Slack connection query param
    if (searchParams.get('slack') === 'connected') {
      showToast('Slack successfully connected!');
      searchParams.delete('slack');
      setSearchParams(searchParams, { replace: true });
    }

    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchData, fetchSlackStatus, searchParams, setSearchParams]);

  // Live Elasticsearch search handler with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchSource(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.emails.search(searchQuery);
        setSearchResults(res.emails);
        setSearchSource(res.source);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCampaignScheduled = (count: number) => {
    showToast(`Successfully scheduled ${count} email(s)!`);
    fetchData(true);
  };

  const displayedEmails = searchResults
    ? searchResults.filter((e) =>
        activeTab === 'scheduled'
          ? e.status === 'SCHEDULED' || e.status === 'PROCESSING'
          : e.status === 'SENT' || e.status === 'FAILED'
      )
    : activeTab === 'scheduled'
    ? scheduledEmails
    : sentEmails;

  return (
    <DashboardLayout slackStatus={slackStatus} onOpenSlackModal={() => setIsSlackOpen(true)}>
      {/* Metrics Row */}
      <StatsOverview
        scheduledCount={totalScheduled}
        sentCount={totalSent}
        hourlyLimit={100}
        activeSenders={1}
      />

      {/* Action Bar: Search, Tabs, Compose */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        {/* Navigation Tabs */}
        <div className="flex items-center p-1 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'scheduled'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Scheduled Emails</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === 'scheduled'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalScheduled}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Sent Emails</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                activeTab === 'sent'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalSent}
            </span>
          </button>
        </div>

        {/* Right Section: Search & Compose */}
        <div className="flex items-center gap-3">
          {/* Elasticsearch Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            title="Refresh queue status"
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Primary Compose Button */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Compose New Email</span>
          </button>
        </div>
      </div>

      {/* Search results banner if active */}
      {searchResults && (
        <div className="mb-4 px-4 py-2 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-900">
          <span>
            Found <strong>{displayedEmails.length}</strong> match(es) for &ldquo;{searchQuery}&rdquo;
          </span>
          <span className="text-[11px] font-mono text-indigo-600 uppercase tracking-wider">
            {searchSource === 'elasticsearch' ? '⚡ Elasticsearch Engine' : 'Relational Query'}
          </span>
        </div>
      )}

      {/* Table Content / States */}
      {loading ? (
        <TableLoadingSkeleton rows={5} />
      ) : displayedEmails.length === 0 ? (
        <EmptyState
          title={
            searchQuery
              ? 'No matching emails found'
              : activeTab === 'scheduled'
              ? 'No emails currently scheduled'
              : 'No emails sent yet'
          }
          description={
            searchQuery
              ? 'Try modifying your search term or clearing the filter.'
              : activeTab === 'scheduled'
              ? 'Create your first automated email campaign to see delayed BullMQ jobs lined up for dispatch.'
              : 'Dispatched emails will appear here along with their direct Ethereal test preview links.'
          }
          actionText={!searchQuery && activeTab === 'scheduled' ? 'Compose First Campaign' : undefined}
          onAction={() => setIsComposeOpen(true)}
        />
      ) : (
        <EmailTable type={activeTab} emails={displayedEmails} />
      )}

      {/* Compose Campaign Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleCampaignScheduled}
      />

      {/* Slack Integration Modal */}
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        status={slackStatus}
        onRefresh={fetchSlackStatus}
        showToast={showToast}
      />

      {/* Toast Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </DashboardLayout>
  );
};
