import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TiltCard } from '../components/TiltCard';

export const Achievements: React.FC = () => {
  const { achievements, achievementsLoading, fetchAchievements, streak, fetchStreak } = useAppStore();

  useEffect(() => {
    fetchAchievements();
    fetchStreak();
  }, [fetchAchievements, fetchStreak]);

  const totalBadges = achievements.earned.length + achievements.available.length;
  const percentComplete = totalBadges > 0 ? Math.round((achievements.earned.length / totalBadges) * 100) : 0;

  const getMedalStyle = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('warrior') || lower.includes('master') || lower.includes('hero')) {
      return 'medal-gradient-emerald text-emerald-950';
    }
    if (lower.includes('expert') || lower.includes('gold') || lower.includes('pro') || lower.includes('streak')) {
      return 'medal-gradient-gold text-amber-950';
    }
    if (lower.includes('commuter') || lower.includes('saver') || lower.includes('silver')) {
      return 'medal-gradient-silver text-neutral-800';
    }
    return 'medal-gradient-bronze text-amber-900';
  };

  const renderMedal = (name: string, isEarned: boolean) => {
    const initials = name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
    
    const medalClass = isEarned ? getMedalStyle(name) : 'bg-neutral-900/60 border-neutral-800 text-neutral-600 grayscale';
    
    return (
      <div className={`medal-3d ${medalClass} mb-4 flex flex-col items-center justify-center font-display font-black text-lg tracking-wider`}>
        <div className="transform-style-3d depth-3">{initials}</div>
        {/* Shiny reflection shine */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none transform-style-3d depth-1" />
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-neutral-100">
          Achievements & Badges
        </h1>
        <p className="text-neutral-450 mt-1 text-sm font-semibold uppercase tracking-wider">
          Green gamification showcase console
        </p>
      </div>

      {achievementsLoading ? (
        <div className="h-64 flex flex-col items-center justify-center animate-pulse" role="status" aria-label="Loading achievements details">
          <div className="spinner border-emerald-500 border-t-transparent animate-spin rounded-full border-4 w-12 h-12"></div>
          <p className="text-neutral-450 mt-4 text-xs font-bold uppercase tracking-wider">Unlocking badges registry...</p>
        </div>
      ) : (
        <>
          {/* Streaks & Progress Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Streak Board */}
            <TiltCard className="p-6 md:col-span-2 flex flex-col justify-between border-emerald-500/10" maxTilt={4}>
              <div>
                <h2 className="text-xs font-bold text-neutral-350 uppercase tracking-widest font-display">Sustainability Streaks</h2>
                <p className="text-xs text-neutral-500 mt-1 font-semibold uppercase tracking-wider">Log entries daily to maintain active multiplier</p>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-neutral-950/40 border border-emerald-950/10 rounded-xl">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block font-display">Current Streak</span>
                    <span className="text-3xl font-display font-extrabold text-amber-500 mt-1 block font-mono">
                      {streak?.current_streak ?? 0} days
                    </span>
                  </div>
                  <div className="p-4 bg-neutral-950/40 border border-emerald-950/10 rounded-xl">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block font-display">Longest Streak</span>
                    <span className="text-3xl font-display font-extrabold text-neutral-100 mt-1 block font-mono">
                      {streak?.longest_streak ?? 0} days
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-[10px] text-neutral-450 font-bold uppercase tracking-wider font-mono">
                {streak?.last_activity_date
                  ? `LAST LOG DATE: ${new Date(streak.last_activity_date).toLocaleDateString()}`
                  : 'NO ACTIVITIES RECORDED YET.'}
              </div>
            </TiltCard>

            {/* Badges Progress */}
            <TiltCard className="p-6 flex flex-col justify-between border-emerald-500/10" maxTilt={4}>
              <div>
                <h2 className="text-xs font-bold text-neutral-350 uppercase tracking-widest font-display">Badges Progress</h2>
                <p className="text-xs text-neutral-500 mt-1 font-semibold uppercase tracking-wider">Console unlock completion ratio</p>
                
                <div className="mt-6 text-center">
                  <div className="text-4xl font-display font-extrabold text-emerald-400 font-mono">
                    {percentComplete}%
                  </div>
                  <div className="text-[10px] text-neutral-450 mt-1 font-bold uppercase tracking-wider font-display">
                    {achievements.earned.length} / {totalBadges} badges unlocked
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-neutral-950 h-2.5 rounded-full mt-6 overflow-hidden border border-neutral-900" aria-hidden="true">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-neon-mint"
                  style={{ width: `${percentComplete}%` }}
                ></div>
              </div>
            </TiltCard>
          </div>

          {/* Badges Section */}
          <div className="space-y-6">
            <h2 className="text-xs font-bold text-neutral-350 uppercase tracking-widest font-display border-b border-neutral-900 pb-3">Badges Showcase</h2>

            {/* Unlocked Badges */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 font-display">
                <span>Earned Badges</span>
                <span className="text-[10px] px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono">
                  {achievements.earned.length}
                </span>
              </h3>
              
              {achievements.earned.length === 0 ? (
                <div className="glass-card p-8 text-center text-xs text-neutral-500 font-semibold uppercase tracking-wider border-emerald-500/10">
                  No badges unlocked yet. Keep logging to earn bronze decal.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {achievements.earned.map((ua) => (
                    <TiltCard key={ua.id} className="p-6 border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 transition-all text-center flex flex-col items-center justify-between shadow-neon-mint">
                      {renderMedal(ua.achievement.name, true)}
                      <div className="mt-2">
                        <h4 className="font-bold text-neutral-100 font-display text-sm">{ua.achievement.name}</h4>
                        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{ua.achievement.description}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-neutral-900/50 w-full text-[9px] text-emerald-400 font-bold uppercase tracking-wider font-mono">
                        Earned {new Date(ua.earned_at).toLocaleDateString()}
                      </div>
                    </TiltCard>
                  ))}
                </div>
              )}
            </div>

            {/* Locked Badges */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-bold text-neutral-450 uppercase tracking-wider flex items-center gap-2 font-display">
                <span>Locked Badges</span>
                <span className="text-[10px] px-2.5 py-0.5 bg-neutral-800 text-neutral-450 border border-neutral-700 rounded-full font-mono">
                  {achievements.available.length}
                </span>
              </h3>

              {achievements.available.length === 0 ? (
                <div className="glass-card p-8 text-center text-xs text-neutral-500 font-semibold uppercase tracking-wider border-emerald-500/10">
                  Congratulations! All medals unlocked.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {achievements.available.map((a) => (
                    <TiltCard key={a.id} className="p-6 opacity-50 hover:opacity-75 transition-all text-center flex flex-col items-center justify-between border-neutral-900">
                      {renderMedal(a.name, false)}
                      <div className="mt-2">
                        <h4 className="font-bold text-neutral-400 font-display text-sm">{a.name}</h4>
                        <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{a.description}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-neutral-900/50 w-full text-[9px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
                        Locked
                      </div>
                    </TiltCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
