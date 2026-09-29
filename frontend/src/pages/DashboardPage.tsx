import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  X,
  Zap,
  Filter,
  Radio,
} from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { StatsOverview } from '../components/StatsOverview';
import { EmailTable } from '../components/EmailTable';
import { ComposeModal } from '../components/ComposeModal';
import { SlackModal } from '../components/SlackModal';
import { QueueMonitorModal } from '../components/QueueMonitorModal';
import { EmptyState } from '../components/EmptyState';
import { TableLoadingSkeleton } from '../components/LoadingSkeleton';
import { Toast } from '../components/Toast';
import { EmailItem, SlackStatus } from '../types/index';
import { api } from '../services/api';
import { useSearchParams } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scheduledEmails, setScheduledEmails] = useState<EmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmailItem[] | null>(null);
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const fetchSlackStatus = useCallback(async () => {
    try {
      const status = await api.slack.getStatus();
      setSlackStatus(status);
    } catch {}
  }, []);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [schedRes, sentRes] = await Promise.all([
        api.emails.getScheduled(1, 100),
        api.emails.getSent(1, 100),
      ]);
      setScheduledEmails(schedRes.emails);
      setTotalScheduled(schedRes.total);
      setSentEmails(sentRes.emails);
      setTotalSent(sentRes.total);
    } catch (err) {
      console.error('Failed to load email lists', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchSlackStatus();
    if (searchParams.get('slack') === 'connected') {
      showToast('Slack workspace successfully connected for rate-limit alerts!');
      searchParams.delete('slack');
      setSearchParams(searchParams, { replace: true });
    }
  }, [fetchData, fetchSlackStatus, searchParams, setSearchParams]);

  // Live telemetry polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchData(true), 4000);
    return () => clearInterval(interval);
  }, [fetchData, autoRefresh]);

  // Search debouncing with Elasticsearch integration
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
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCampaignScheduled = (count: number) => {
    showToast(`Successfully scheduled ${count} email${count !== 1 ? 's' : ''} in BullMQ queue!`);
    fetchData(true);
  };

  // Filter based on tab and optional sub-status
  const baseList = searchResults
    ? searchResults.filter((e) =>
        activeTab === 'scheduled'
          ? e.status === 'SCHEDULED' || e.status === 'PROCESSING'
          : e.status === 'SENT' || e.status === 'FAILED'
      )
    : activeTab === 'scheduled'
    ? scheduledEmails
    : sentEmails;

  const displayedEmails =
    statusFilter === 'ALL'
      ? baseList
      : baseList.filter((e) => e.status === statusFilter);

  return (
    <DashboardLayout
      slackStatus={slackStatus}
      onOpenSlackModal={() => setIsSlackOpen(true)}
      onOpenQueueModal={() => setIsQueueOpen(true)}
    >
      {/* Metrics Row */}
      <StatsOverview
        scheduledCount={totalScheduled}
        sentCount={totalSent}
        hourlyLimit={100}
        activeSenders={1}
      />

      {/* Control Bar: Tabs, Filters, Search & Actions */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Primary View Switcher */}
          <div className="flex items-center bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-1 gap-1 shadow-xs w-fit">
            {(
              [
                ['scheduled', CalendarClock, 'Scheduled Pipeline', totalScheduled],
                ['sent', CheckCircle2, 'Dispatched History', totalSent],
              ] as const
            ).map(([tab, Icon, label, count]) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab as 'scheduled' | 'sent');
                  setStatusFilter('ALL');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 stroke-[2.25]" />
                {label}
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    activeTab === tab
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Right Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Fuzzy search emails & subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 pl-8.5 pr-8 py-2 text-xs rounded-xl border border-slate-200/80 bg-white placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Live updates: Active' : 'Live updates: Paused'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  autoRefresh ? 'text-emerald-600 animate-pulse' : 'text-slate-400'
                }`}
              />
              <span className="hidden lg:inline">{autoRefresh ? 'Live' : 'Paused'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              title="Manual Sync"
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : ''}`}
              />
            </button>

            {/* Compose Button */}
            <button
              onClick={() => setIsComposeOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Secondary Sub-filters: Status chips */}
        <div className="flex items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {activeTab === 'scheduled' ? (
            <>
              {['ALL', 'SCHEDULED', 'PROCESSING'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer text-xs ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st === 'ALL' ? 'All Queued' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </>
          ) : (
            <>
              {['ALL', 'SENT', 'FAILED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer text-xs ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st === 'ALL' ? 'All Sent' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Elasticsearch Source Indicator */}
      {searchResults && searchQuery && (
        <div className="mb-3 flex items-center justify-between px-4 py-2 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs">
          <span className="text-indigo-900 font-medium">
            Found <strong>{displayedEmails.length}</strong> match
            {displayedEmails.length !== 1 ? 'es' : ''} for &ldquo;{searchQuery}&rdquo;
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200/60 shadow-2xs">
            {searchSource === 'elasticsearch' ? (
              <>
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                Elasticsearch Query
              </>
            ) : (
              'PostgreSQL Fallback'
            )}
          </span>
        </div>
      )}

      {/* Email Table Content */}
      {loading ? (
        <TableLoadingSkeleton rows={6} />
      ) : displayedEmails.length === 0 ? (
        <EmptyState
          title={
            searchQuery
              ? 'No matching emails found'
              : activeTab === 'scheduled'
              ? 'No scheduled jobs in queue'
              : 'No dispatch history yet'
          }
          description={
            searchQuery
              ? 'Try modifying your search query or reset the active filter.'
              : activeTab === 'scheduled'
              ? 'Schedule your first outreach campaign to populate BullMQ delayed jobs with per-sender rate limiting.'
              : 'Dispatched emails will appear here with delivery timestamps and Ethereal preview URLs.'
          }
          actionText={!searchQuery && activeTab === 'scheduled' ? 'Create First Campaign' : undefined}
          onAction={() => setIsComposeOpen(true)}
        />
      ) : (
        <EmailTable type={activeTab} emails={displayedEmails} />
      )}

      {/* Modals & Toasts */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleCampaignScheduled}
      />
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        status={slackStatus}
        onRefresh={fetchSlackStatus}
        showToast={showToast}
      />
      <QueueMonitorModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
};
