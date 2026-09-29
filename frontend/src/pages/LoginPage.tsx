import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../services/api';

export const LoginPage: React.FC = () => {
  const { loginWithDemo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const errorParam = searchParams.get('error');

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">Login</h1>

        {/* Error alert */}
        {errorParam && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorParam}</span>
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
        <form onSubmit={handleDemoLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:bg-white transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:bg-white transition-colors"
          />

          <button
            type="submit"
            disabled={loadingDemo}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors duration-150 cursor-pointer flex items-center justify-center gap-2"
          >
            {loadingDemo ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Reviewer access note */}
        <p className="mt-4 text-center text-xs text-gray-400">
          Reviewer? Leave fields blank and click Login for 1-click demo access.
        </p>
      </div>
    </div>
  );
};
