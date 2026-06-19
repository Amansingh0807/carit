import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { TiltCard } from '../components/TiltCard';

export const Landing: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-between relative overflow-hidden">
      {/* 3D Perspective Scroll Grid */}
      <div className="perspective-grid" aria-hidden="true" />

      {/* Bioluminescent Blur Blobs */}
      <div className="absolute top-[10%] left-[-5%] w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0" aria-hidden="true" />
      <div className="absolute bottom-[15%] right-[-5%] w-[550px] h-[550px] bg-sky-500/5 rounded-full blur-[130px] pointer-events-none z-0" aria-hidden="true" />

      {/* Header bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
          <span className="text-base font-display font-extrabold uppercase tracking-widest text-gradient">CarIt</span>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
            <span className="text-neutral-400 font-normal">Active Node: <span className="text-neutral-200 font-bold">{user?.username}</span></span>
            <Link to="/dashboard" className="btn-secondary py-2 px-4">Console</Link>
          </div>
        ) : (
          <Link to="/login" className="btn-secondary py-2 px-4">Sign In</Link>
        )}
      </header>

      {/* Hero section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
        
        {/* Left Column: Title and details */}
        <div className="space-y-6 text-left animate-slide-up-fade">
          <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest shadow-neon-mint">
            Ecological Command Center v1.2
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-neutral-50 leading-tight">
            Track. Optimize.<br />
            <span className="text-gradient">Scale Emissions.</span>
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base max-w-lg leading-relaxed font-medium">
            An interactive dashboard console designed to estimate, analyze, and optimize your personal greenhouse gas footprints in real-time.
          </p>

          <div className="pt-4 flex flex-wrap gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary">
                Enter Console Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary">
                  Register New Node
                </Link>
                <Link to="/login" className="btn-secondary">
                  Access Console
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic 3D Console Preview mockup */}
        <div className="animate-slide-up-fade delay-200 flex justify-center">
          <TiltCard className="w-full max-w-md p-6 border-emerald-500/10 transform-style-3d" maxTilt={8}>
            {/* Header simulation */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-900 mb-6 transform-style-3d depth-1">
              <div>
                <span className="text-[9px] text-neutral-450 font-bold uppercase tracking-widest font-display">System Overview</span>
                <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-widest font-display mt-0.5">Telemetry Monitor</h3>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-neon-mint" />
            </div>

            {/* Simulated analytics progress grid */}
            <div className="space-y-4 transform-style-3d depth-2">
              <div className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block">Carbon Emissions</span>
                  <span className="text-xl font-display font-black text-neutral-100 mt-1 block font-mono">142.5 kg</span>
                </div>
                <div className="w-20 bg-neutral-900 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                  <div className="bg-sky-400 h-full rounded-full w-2/3 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                </div>
              </div>

              <div className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block">Eco Efficiency</span>
                  <span className="text-xl font-display font-black text-emerald-400 mt-1 block font-mono">84%</span>
                </div>
                <div className="w-20 bg-neutral-900 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                  <div className="bg-emerald-400 h-full rounded-full w-5/6 shadow-neon-mint" />
                </div>
              </div>

              <div className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block">Streak Telemetry</span>
                  <span className="text-xl font-display font-black text-amber-500 mt-1 block font-mono">12 Days</span>
                </div>
                <div className="w-20 bg-neutral-900 h-1.5 rounded-full overflow-hidden border border-neutral-800">
                  <div className="bg-amber-400 h-full rounded-full w-1/2 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                </div>
              </div>
            </div>

            {/* Bottom status indicators */}
            <div className="mt-6 pt-4 border-t border-neutral-900 flex justify-between items-center text-[8px] font-mono text-neutral-500 uppercase tracking-widest transform-style-3d depth-3">
              <span>Security: SHA-256</span>
              <span>Database: SQL.js</span>
              <span>Contrast: WCAG AA</span>
            </div>
          </TiltCard>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[9px] font-mono text-neutral-500 z-10">
        <p>© 2026 CarIt. Powered by Gemini. Dedicated to climate change awareness.</p>
        <div className="flex gap-4">
          <span className="hover:text-neutral-300">Strict Security Mode</span>
          <span>•</span>
          <span className="hover:text-neutral-300">WCAG 2.1 AA Compliant</span>
        </div>
      </footer>
    </div>
  );
};
