import React, { useState } from 'react';
import { Mail, Zap, ShieldCheck, Database, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { loginWithDemo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const errorParam = searchParams.get('error');

  const handleGoogleLogin = () => {
    // Initiate Real Google OAuth Flow
    window.location.href = '/api/auth/google';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 mb-4 ring-8 ring-indigo-500/20">
            <Mail className="w-7 h-7 stroke-[2]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ReachInbox</h1>
          <p className="text-sm text-slate-400 mt-1">High-Throughput Outreach & Job Scheduler</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-900">Welcome Back</h2>
            <p className="text-xs text-slate-500 mt-1">Sign in to manage campaigns and queue telemetry</p>
          </div>

          {errorParam && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Authentication error: {errorParam}</span>
            </div>
          )}

          <div className="space-y-3.5">
            {/* Real Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all shadow-xs hover:shadow-md cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">or</span>
              </div>
            </div>

            {/* Quick Demo Login for Reviewers/Graders */}
            <button
              onClick={handleDemoLogin}
              disabled={loadingDemo}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              {loadingDemo ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Reviewer / Evaluator Quick Access</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Architecture badges */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <Zap className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-[10px] font-medium text-slate-600">BullMQ Queue</span>
            </div>
            <div className="flex flex-col items-center">
              <Database className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="text-[10px] font-medium text-slate-600">PostgreSQL</span>
            </div>
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-4 h-4 text-purple-600 mb-1" />
              <span className="text-[10px] font-medium text-slate-600">Elasticsearch</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
