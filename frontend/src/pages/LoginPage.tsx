import React, { useState } from 'react';
import { Mail, Zap, Shield, Database, ArrowRight, AlertCircle, Activity, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../services/api';

export const LoginPage: React.FC = () => {
  const { loginWithDemo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const errorParam = searchParams.get('error');

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleDemoLogin = async () => {
    setLoadingDemo(true);
    try {
      await loginWithDemo();
      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login failed', err);
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row antialiased selection:bg-indigo-500 selection:text-white">
      {/* Left Panel — Brand & Engineering Highlights */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 relative overflow-hidden border-r border-indigo-900/30">
        {/* Ambient lighting glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-80 h-80 bg-indigo-600/10 rounded-full blur-2xl" />
        </div>

        {/* Blueprint background grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 border border-indigo-400/20">
              <Mail className="w-5 h-5 text-white stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-xl tracking-tight">ReachInbox</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-400/30">
                  Scheduler
                </span>
              </div>
              <p className="text-xs text-indigo-200/60 mt-0.5">Distributed Queue Architecture</p>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative z-10 my-auto py-12 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-xs font-medium text-indigo-300 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>BullMQ Delayed Queue & Rate-Limiter Engine</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight">
            High-throughput{' '}
            <span className="bg-gradient-to-r from-indigo-300 via-indigo-200 to-blue-200 bg-clip-text text-transparent">
              Email Outreach
            </span>{' '}
            at scale.
          </h1>

          <p className="mt-5 text-slate-300 text-base xl:text-lg leading-relaxed font-normal">
            Production-grade distributed scheduling pipeline built with BullMQ delayed queues, Redis state tracking, PostgreSQL persistence, and Elasticsearch telemetry.
          </p>

          {/* Architecture Chips */}
          <div className="mt-8 flex flex-wrap gap-2.5">
            {[
              { icon: Zap, label: 'BullMQ Queues' },
              { icon: Database, label: 'PostgreSQL + Prisma' },
              { icon: Shield, label: 'Elasticsearch Index' },
              { icon: Activity, label: 'Bull Board Admin UI' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-slate-200 backdrop-blur-sm"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="relative z-10 pt-8 border-t border-white/10 grid grid-cols-3 gap-6">
          {[
            { value: '100/hr', label: 'Rate limit per sender', desc: 'Sliding window throttling' },
            { value: '< 2s', label: 'Min dispatch delay', desc: 'Configurable staggers' },
            { value: '∞', label: 'Scalable recipients', desc: 'BullMQ chunked workers' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
              <div className="text-xs font-semibold text-slate-300 mt-1">{stat.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{stat.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Interactive Authentication & Reviewer Access */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#f8fafc]">
        <div className="w-full max-w-md">
          {/* Mobile branding header */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/25">
              <Mail className="w-5 h-5 text-white stroke-[2]" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">ReachInbox</span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                Scheduler
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 mt-1 text-sm">
              Sign in to manage scheduled campaigns and monitor queue telemetry
            </p>
          </div>

          {/* Error alert */}
          {errorParam && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-800 animate-scale-up">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication failed</p>
                <p className="text-xs text-red-700 mt-0.5">{errorParam}</p>
              </div>
            </div>
          )}

          {/* Action Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            {/* Google OAuth Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium">or instant evaluation</span>
              </div>
            </div>

            {/* Demo / Reviewer 1-click Quick Access */}
            <button
              onClick={handleDemoLogin}
              disabled={loadingDemo}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all duration-150 shadow-md shadow-indigo-600/25 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {loadingDemo ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Entering Dashboard...</span>
                </>
              ) : (
                <>
                  <span>Reviewer 1-Click Access</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Explanatory Note */}
            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500 leading-relaxed">
                Reviewer access logs in with pre-seeded test senders and campaigns. No OAuth credentials required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
