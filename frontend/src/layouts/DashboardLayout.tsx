import React from 'react';
import { LogOut, Activity, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SlackStatus } from '../types/index';

interface DashboardLayoutProps {
  children: React.ReactNode;
  slackStatus: SlackStatus;
  onOpenSlackModal: () => void;
  onOpenQueueModal?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  slackStatus,
  onOpenSlackModal,
  onOpenQueueModal,
}) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Glass Navigation Bar */}
      <header className="sticky top-0 z-40 h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/80 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
          {/* Brand & Live status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-tr from-indigo-700 to-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/25 flex-shrink-0">
                <Mail className="w-5 h-5 text-white stroke-[2]" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm tracking-tight">ReachInbox</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    Scheduler
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-none mt-0.5">Distributed Outreach Pipeline</p>
              </div>
            </div>

            {/* Live Queue Worker Pill */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-emerald-50/80 border border-emerald-200/80 rounded-full text-[11px] text-emerald-800 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>BullMQ Worker Active</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            {/* Bull Board Trigger */}
            <button
              onClick={onOpenQueueModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all duration-150 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Queue Telemetry</span>
            </button>

            {/* Slack integration button */}
            <button
              onClick={onOpenSlackModal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-150 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                slackStatus.connected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {/* Custom Slack SVG */}
              <svg
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  slackStatus.connected ? 'text-emerald-600' : 'text-slate-600'
                }`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
              <span className="hidden sm:inline">
                {slackStatus.connected ? 'Slack Alerts Active' : 'Connect Slack'}
              </span>
              {slackStatus.connected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            {/* User profile */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
                <img
                  src={
                    user.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user.name
                    )}&background=4f46e5&color=fff&bold=true`
                  }
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-slate-200 shadow-xs object-cover flex-shrink-0"
                />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Log out"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/70 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ReachInbox Distributed Scheduler &bull; Production Outreach Architecture</span>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
            <span>BullMQ</span>
            <span>&bull;</span>
            <span>Redis</span>
            <span>&bull;</span>
            <span>PostgreSQL</span>
            <span>&bull;</span>
            <span>Elasticsearch</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
