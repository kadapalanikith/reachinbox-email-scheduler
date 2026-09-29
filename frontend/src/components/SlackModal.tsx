import React, { useState } from 'react';
import { X, CheckCircle2, Bell, Unlink, ExternalLink } from 'lucide-react';
import { SlackStatus } from '../types/index';
import { api } from '../services/api';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SlackStatus;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const SlackIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
);

export const SlackModal: React.FC<SlackModalProps> = ({ isOpen, onClose, status, onRefresh, showToast }) => {
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  if (!isOpen) return null;

  const handleConnect = () => { window.location.href = '/api/slack/connect'; };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.slack.disconnect();
      showToast('Slack workspace disconnected');
      onRefresh();
    } catch {
      showToast('Failed to disconnect Slack', 'error');
    } finally { setDisconnecting(false); }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    try {
      await api.slack.testNotification();
      showToast('Test notification posted to Slack!');
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to send test alert', 'error');
    } finally { setTesting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md animate-scale-up overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4A154B]/10 flex items-center justify-center">
              <SlackIcon className="w-4.5 h-4.5 text-[#4A154B]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Slack Integration</h3>
              <p className="text-xs text-slate-500">Rate-limit alert notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {status.connected ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Connected</p>
                  <p className="text-sm font-semibold text-emerald-950 mt-0.5">
                    {status.connection?.teamName || 'Active Workspace'}
                  </p>
                  {status.connection?.channelName && (
                    <p className="text-xs text-emerald-700 mt-0.5 font-mono">
                      #{status.connection.channelName}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                When a sender hits their hourly rate limit, a formatted Slack notification will be posted with rescheduling statistics.
              </p>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleTestAlert}
                  disabled={testing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-60"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {testing ? 'Sending...' : 'Send Test Alert'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-60"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 py-2">
              <p className="text-sm text-slate-600 leading-relaxed">
                Connect your team's Slack workspace to receive real-time alerts whenever a rate limit is hit during dispatch.
              </p>
              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-[#4A154B] hover:bg-[#3d1140] text-white text-sm font-semibold rounded-xl transition-all duration-150 shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A154B] focus-visible:ring-offset-2"
              >
                <SlackIcon className="w-4 h-4" />
                Connect with Slack
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
