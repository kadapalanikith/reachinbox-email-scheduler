import React, { useState } from 'react';
import { X, Slack, CheckCircle, Bell, Unlink, ExternalLink } from 'lucide-react';
import { SlackStatus } from '../types/index';
import { api } from '../services/api';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SlackStatus;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefresh,
  showToast,
}) => {
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  if (!isOpen) return null;

  const handleConnect = () => {
    // Redirect to backend Slack OAuth endpoint
    window.location.href = '/api/slack/connect';
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.slack.disconnect();
      showToast('Slack workspace disconnected successfully');
      onRefresh();
    } catch (err: any) {
      showToast('Failed to disconnect Slack', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    try {
      await api.slack.testNotification();
      showToast('Test notification posted to Slack!');
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to dispatch Slack test', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Slack className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Slack Integration</h3>
              <p className="text-xs text-slate-500">Automated rate-limit alert notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {status.connected ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Connected Workspace</h4>
                  <p className="text-sm font-semibold text-emerald-950 mt-0.5">
                    {status.connection?.teamName || 'Active Workspace'}
                  </p>
                  {status.connection?.channelName && (
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Channel: #{status.connection.channelName}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                Whenever a sender reaches their hourly rate limit, a formatted notification will be posted to this Slack workspace with rescheduling statistics.
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleTestAlert}
                  disabled={testing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {testing ? 'Sending...' : 'Send Test Alert'}
                </button>

                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-medium transition-all cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Connect your team’s Slack workspace to receive real-time alerts the moment an outreach rate limit is hit.
              </p>

              <button
                onClick={handleConnect}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-all shadow-md cursor-pointer"
              >
                <Slack className="w-4 h-4" />
                <span>Connect Slack Workspace</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
