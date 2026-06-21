import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { TiltCard } from '../components/TiltCard';

export const Login: React.FC = () => {
  const { login, error, clearError, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email || !password) {
      setValidationError('Please fill in all fields');
      return;
    }

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* 3D Scroll Grid Background */}
      <div className="perspective-grid" aria-hidden="true"></div>

      {/* Background glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 animate-slide-up-fade">
        <div className="text-center">
          {/* Custom SVG replacing globe emoji */}
          <svg className="w-12 h-12 mx-auto text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
          <h1 className="mt-6 text-4xl font-display font-extrabold text-gradient">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Sign in to track and cut your carbon emissions today.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 animate-slide-up-fade delay-100">
        <TiltCard className="p-8 sm:rounded-3xl border-emerald-500/20" maxTilt={6}>
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {/* Error notifications */}
            {(error || validationError) && (
              <div
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold uppercase tracking-wider"
                role="alert"
                aria-live="polite"
              >
                {validationError || error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-neutral-350 uppercase tracking-widest mb-2 font-display">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                aria-required="true"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-neutral-350 uppercase tracking-widest mb-2 font-display">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                aria-required="true"
              />
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex justify-center py-3.5 text-xs font-extrabold"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner border-neutral-950 border-t-transparent w-4 h-4"></span>
                    Signing In...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Registration Link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-neutral-450 uppercase tracking-wider font-bold">
              Don't have an account?{' '}
              <Link to="/register" className="text-emerald-400 font-extrabold hover:text-emerald-300 hover:underline transition-colors ml-1">
                Create one now
              </Link>
            </p>
          </div>
        </TiltCard>
      </div>
    </div>
  );
};
