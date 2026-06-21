import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { streak, fetchStreak } = useAppStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);

  // Accessibility state
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('accessibility_high_contrast') === 'true';
  });
  const [largeText, setLargeText] = useState(() => {
    return localStorage.getItem('accessibility_large_text') === 'true';
  });

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    localStorage.setItem('accessibility_high_contrast', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    if (largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    localStorage.setItem('accessibility_large_text', String(largeText));
  }, [largeText]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Log Activity', path: '/activities' },
    { name: 'Recommendations', path: '/recommendations' },
    { name: 'Achievements', path: '/achievements' },
  ];

  return (
    <div className={`min-h-screen bg-neutral-950 flex flex-col transition-colors duration-200 relative overflow-hidden`}>
      {/* 3D Scroll Grid Background */}
      <div className="perspective-grid" aria-hidden="true"></div>

      {/* Solarpunk Glowing Ambient Radial Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0" aria-hidden="true"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none z-0" aria-hidden="true"></div>
      <div className="absolute top-[40%] left-[60%] w-[350px] h-[350px] bg-emerald-400/5 rounded-full blur-[100px] pointer-events-none z-0" aria-hidden="true"></div>

      {/* Skip to Content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-emerald-600 text-neutral-950 px-4 py-2 rounded-lg z-50 font-semibold"
      >
        Skip to main content
      </a>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-neutral-900/80 backdrop-blur-md border-b border-emerald-950/20" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Emojis removed and replaced with geometric SVG */}
            <div className="flex items-center">
              <NavLink to="/dashboard" className="flex items-center gap-2.5" aria-label="CarIt Home">
                <svg className="w-5 h-5 text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
                <span className="text-lg font-display font-extrabold text-gradient tracking-wide">CarIt</span>
              </NavLink>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1" role="navigation" aria-label="Main navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 relative ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-neon-mint'
                        : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>

            {/* Right Side Info & Accessibility Actions */}
            <div className="hidden md:flex items-center gap-4">
              {/* Streak Badge */}
              {streak && streak.current_streak > 0 && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-[10px] font-extrabold uppercase tracking-wider shadow-neon-amber"
                  title={`Streak: ${streak.current_streak} days`}
                  role="status"
                  aria-label={`${streak.current_streak} days streak`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  <span>STREAK: {streak.current_streak} Days</span>
                </div>
              )}

              {/* Accessibility Settings Toggle - Emojis removed and replaced with SVG */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccessibilityOpen(!accessibilityOpen)}
                  onKeyDown={(e) => e.key === 'Escape' && setAccessibilityOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800 transition-colors"
                  aria-label="Accessibility options"
                  aria-expanded={accessibilityOpen}
                  aria-haspopup="true"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
                {accessibilityOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-emerald-950/40 rounded-xl shadow-2xl p-4 z-50 text-sm">
                    <h3 className="font-bold text-neutral-100 mb-3 border-b border-emerald-950 pb-1.5 flex items-center justify-between text-xs uppercase tracking-wider font-display">
                      <span>Accessibility Settings</span>
                      <button onClick={() => setAccessibilityOpen(false)} className="text-neutral-450 hover:text-neutral-100" aria-label="Close settings">✕</button>
                    </h3>
                    
                    <div className="flex flex-col gap-3">
                      {/* High Contrast Toggle */}
                      <label className="flex items-center justify-between cursor-pointer select-none text-xs font-bold uppercase tracking-wide">
                        <span className="text-neutral-350">High Contrast</span>
                        <input
                          type="checkbox"
                          checked={highContrast}
                          onChange={(e) => setHighContrast(e.target.checked)}
                          className="w-4 h-4 text-emerald-500 border-neutral-600 rounded bg-neutral-900 focus:ring-emerald-500 focus:ring-offset-neutral-800"
                        />
                      </label>

                      {/* Text Scaling Toggle */}
                      <label className="flex items-center justify-between cursor-pointer select-none text-xs font-bold uppercase tracking-wide">
                        <span className="text-neutral-350">Larger Text</span>
                        <input
                          type="checkbox"
                          checked={largeText}
                          onChange={(e) => setLargeText(e.target.checked)}
                          className="w-4 h-4 text-emerald-500 border-neutral-600 rounded bg-neutral-900 focus:ring-emerald-500 focus:ring-offset-neutral-800"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Card */}
              <div className="flex items-center gap-3 pl-3 border-l border-emerald-950/20">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-neutral-200 font-display">{user?.username}</span>
                  <span className="text-[10px] text-neutral-450 font-mono">{user?.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-[10px] font-extrabold rounded-lg uppercase tracking-wider transition-all"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {/* Mobile accessibility quick access */}
              <button
                type="button"
                onClick={() => setAccessibilityOpen(!accessibilityOpen)}
                className="p-2 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800 transition-colors"
                aria-label="Accessibility settings"
                aria-expanded={accessibilityOpen}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              
              {accessibilityOpen && (
                <div className="absolute right-12 top-14 w-56 bg-neutral-900 border border-emerald-950/40 rounded-xl shadow-lg p-4 z-50 text-sm">
                  <h3 className="font-bold text-neutral-100 mb-3 border-b border-emerald-950 pb-1.5 flex items-center justify-between text-xs uppercase tracking-wider font-display">
                    <span>Accessibility Settings</span>
                    <button onClick={() => setAccessibilityOpen(false)} className="text-neutral-400 hover:text-neutral-100" aria-label="Close settings">✕</button>
                  </h3>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center justify-between cursor-pointer select-none text-xs font-bold uppercase tracking-wide">
                      <span className="text-neutral-300">High Contrast</span>
                      <input
                        type="checkbox"
                        checked={highContrast}
                        onChange={(e) => setHighContrast(e.target.checked)}
                        className="w-4 h-4 text-emerald-500 border-neutral-600 rounded bg-neutral-900"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer select-none text-xs font-bold uppercase tracking-wide">
                      <span className="text-neutral-300">Larger Text</span>
                      <input
                        type="checkbox"
                        checked={largeText}
                        onChange={(e) => setLargeText(e.target.checked)}
                        className="w-4 h-4 text-emerald-500 border-neutral-600 rounded bg-neutral-900"
                      />
                    </label>
                  </div>
                </div>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
                aria-label={mobileMenuOpen ? 'Close main menu' : 'Open main menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-neutral-900 border-b border-emerald-950/20 animate-slide-down">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                      isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
              <div className="border-t border-emerald-950/20 mt-4 pt-4 px-3 flex flex-col gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-neutral-200 font-display">{user?.username}</span>
                  <span className="text-[10px] text-neutral-450 font-mono mb-3">{user?.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-center py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 outline-none z-10" tabIndex={-1} role="main">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-neutral-950 border-t border-emerald-950/10 py-6 mt-auto text-center text-[10px] font-mono text-neutral-500 z-10" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 CarIt. Powered by Gemini. Dedicated to climate change awareness.</p>
          <div className="flex gap-4">
            <span className="hover:text-neutral-300">Strict Security Mode</span>
            <span>•</span>
            <span className="hover:text-neutral-300">WCAG 2.1 AA Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
