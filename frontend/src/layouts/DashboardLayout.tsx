import React from 'react';
import { LogOut, Activity, Slack, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SlackStatus } from '../types/index';

interface DashboardLayoutProps {
  children: React.ReactNode;
  slackStatus: SlackStatus;
  onOpenSlackModal: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  slackStatus,
  onOpenSlackModal,
}) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Product Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Mail className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                ReachInbox
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 uppercase tracking-wider">
                  Scheduler
                </span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">AI-Driven Outreach Infrastructure</p>
            </div>
          </div>

          {/* Header Action Items */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Bull Board Real-time Queue Monitor Link */}
            <a
              href="/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-2xs"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden md:inline">Queue Monitor</span>
            </a>

            {/* Slack Connection Button / Badge */}
            <button
              onClick={onOpenSlackModal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-2xs cursor-pointer ${
                slackStatus.connected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Slack className={`w-3.5 h-3.5 ${slackStatus.connected ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">
                {slackStatus.connected ? 'Slack Connected' : 'Connect Slack'}
              </span>
              {slackStatus.connected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse" />
              )}
            </button>

            {/* User Profile Info */}
            {user && (
              <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200">
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-2xs"
                />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[130px]">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate max-w-[130px]">
                    {user.email}
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Log out"
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-400">
        ReachInbox Distributed Job Scheduler &bull; Powered by BullMQ, Redis, PostgreSQL & Elasticsearch
      </footer>
    </div>
  );
};
