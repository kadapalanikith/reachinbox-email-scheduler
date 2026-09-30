import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ComposeModal } from '../components/ComposeModal';
import { SlackModal } from '../components/SlackModal';
import { QueueMonitorModal } from '../components/QueueMonitorModal';
import { QueueDashboardView } from '../components/QueueDashboardView';
import { EmailListView } from '../components/EmailListView';
import { Toast } from '../components/Toast';
import { EmailItem, SlackStatus } from '../types/index';
import { api } from '../services/api';
import { useSearchParams } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'queue'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'queue' || tab === 'sent') return tab;
    return 'scheduled';
  });
  const [scheduledEmails, setScheduledEmails] = useState<EmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmailItem[] | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const handleTabChange = (tab: 'scheduled' | 'sent' | 'queue') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'scheduled') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    setSearchParams(newParams, { replace: true });
  };

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
      showToast('Slack workspace successfully connected!');
      searchParams.delete('slack');
      setSearchParams(searchParams, { replace: true });
    } else if (searchParams.get('slack_error')) {
      showToast(`Slack connection failed: ${searchParams.get('slack_error')}`, 'error');
      searchParams.delete('slack_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [fetchData, fetchSlackStatus, searchParams, setSearchParams]);

  // Live telemetry polling every 4s
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Search debouncing with Elasticsearch integration
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.emails.search(searchQuery);
        setSearchResults(res.emails);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCampaignScheduled = (count: number) => {
    showToast(`Successfully scheduled ${count} email${count !== 1 ? 's' : ''} in queue!`);
    fetchData(true);
  };

  const baseList = searchResults
    ? searchResults.filter((e) =>
        activeTab === 'scheduled'
          ? e.status === 'SCHEDULED' || e.status === 'PROCESSING'
          : e.status === 'SENT' || e.status === 'FAILED'
      )
    : activeTab === 'scheduled'
    ? scheduledEmails
    : sentEmails;

  return (
    <DashboardLayout
      slackStatus={slackStatus}
      onOpenSlackModal={() => setIsSlackOpen(true)}
      onOpenQueueModal={() => handleTabChange('queue')}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      scheduledCount={totalScheduled}
      sentCount={totalSent}
      onCompose={() => setIsComposeOpen(true)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onRefresh={() => fetchData(true)}
      refreshing={refreshing}
    >
      {activeTab === 'queue' ? (
        <QueueDashboardView onBack={() => handleTabChange('scheduled')} />
      ) : (
        <EmailListView
          emails={baseList}
          type={activeTab}
          loading={loading}
          onCompose={() => setIsComposeOpen(true)}
        />
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
