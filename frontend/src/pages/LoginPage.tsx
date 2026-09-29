import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { API_BASE } from '../services/api';

export const LoginPage: React.FC = () => {
  const { loginWithDemo, loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const errorParam = searchParams.get('error');

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleDemoLogin = async () => {
    setLoadingDemo(true);
    setError(null);
    try {
      await loginWithDemo();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Demo login failed', err);
      setError('Demo login failed. Please try again.');
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If both empty, fallback to demo login for 1-click convenience
    if (!email.trim() && !password) {
      return handleDemoLogin();
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await loginWithEmail(email.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      const serverMessage = err.response?.data?.error?.message;
      if (serverMessage && !serverMessage.toLowerCase().includes('database') && !serverMessage.toLowerCase().includes('prisma')) {
        setError(serverMessage);
      } else {
        setError('Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        {/* ReachInbox Branding */}
        <div className="text-center mb-1">
          <span className="text-xs font-bold tracking-widest uppercase text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
            ReachInbox
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mt-2 mb-6">Login</h1>

        {/* OAuth URL Error alert */}
        {errorParam && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorParam}</span>
          </div>
        )}

        {/* Local / Form Error alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-green-100 transition-colors duration-150 mb-4 cursor-pointer"
        >
          {/* Google G logo */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          Login with Google
        </button>

        {/* Divider */}
        <div className="relative flex items-center mb-4">
          <div className="flex-1 border-t border-gray-200" />
          <span className="px-3 text-xs text-gray-400">or sign up through email</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Email / Password form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:bg-white transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:bg-white transition-colors"
          />

          <button
            type="submit"
            disabled={loading || loadingDemo}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors duration-150 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Sign up link */}
        <div className="mt-4 text-center text-xs text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-green-600 hover:text-green-700 hover:underline">
            Sign up
          </Link>
        </div>

        {/* Divider for Reviewer */}
        <div className="relative flex items-center my-4">
          <div className="flex-1 border-t border-gray-100" />
          <span className="px-2 text-[11px] text-gray-400">or evaluator</span>
          <div className="flex-1 border-t border-gray-100" />
        </div>

        {/* Reviewer 1-Click Access Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loadingDemo || loading}
          className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors duration-150 cursor-pointer flex items-center justify-center gap-2"
        >
          {loadingDemo ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span>Signing in as Reviewer...</span>
            </>
          ) : (
            'Reviewer 1-Click Access'
          )}
        </button>
      </div>
    </div>
  );
};
