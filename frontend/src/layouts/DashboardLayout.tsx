import React from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SlackStatus } from '../types/index';

interface DashboardLayoutProps {
  children: React.ReactNode;
  slackStatus: SlackStatus;
  onOpenSlackModal: () => void;
  onOpenQueueModal?: () => void;
  // Sidebar-specific props
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  scheduledCount: number;
  sentCount: number;
  onCompose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  scheduledCount,
  sentCount,
  onCompose,
  searchQuery,
  onSearchChange,
  onRefresh,
  refreshing,
}) => {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-white flex antialiased" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Left Sidebar ── */}
      <aside className="w-44 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
        {/* Logo */}
        <div className="px-4 pt-4 pb-3">
          <span className="text-2xl font-black tracking-tight text-gray-900 select-none">ONB</span>
        </div>

        {/* User profile section */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <img
              src={
                user?.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=4f46e5&color=fff&bold=true&size=64`
              }
              alt={user?.name || 'User'}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-200"
            />
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs font-semibold text-gray-800 truncate leading-tight">
                {user?.name || 'User'}
              </div>
              <div className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">
                {user?.email || ''}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </button>
          {profileOpen && (
            <div className="mt-1 mx-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Compose button */}
        <div className="px-3 pb-4">
          <button
            onClick={onCompose}
            className="w-full py-2 border border-green-500 text-green-600 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors cursor-pointer"
          >
            Compose
          </button>
        </div>

        {/* CORE section */}
        <div className="px-4 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Core</span>
        </div>

        <nav className="flex-1 px-2">
          {/* Scheduled */}
          <button
            onClick={() => onTabChange('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer mb-0.5 ${
              activeTab === 'scheduled'
                ? 'bg-green-50 text-green-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {/* Clock/schedule icon */}
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Scheduled</span>
            </div>
            <span className={`text-xs font-medium ${activeTab === 'scheduled' ? 'text-green-600' : 'text-gray-400'}`}>
              {scheduledCount}
            </span>
          </button>

          {/* Sent */}
          <button
            onClick={() => onTabChange('sent')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-green-50 text-green-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {/* Send icon */}
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span>Sent</span>
            </div>
            <span className={`text-xs font-medium ${activeTab === 'sent' ? 'text-green-600' : 'text-gray-400'}`}>
              {sentCount}
            </span>
          </button>
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: search + actions */}
        <header className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-white">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-colors"
            />
          </div>

          {/* Filter icon */}
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>

          {/* Refresh icon */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
