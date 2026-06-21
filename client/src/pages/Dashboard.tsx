import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { TiltCard } from '../components/TiltCard';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    analyticsSummary,
    analyticsLoading,
    analyticsRange,
    setAnalyticsRange,
    fetchAnalyticsSummary,
    streak,
    fetchStreak,
    achievements,
    fetchAchievements,
    recommendations,
    fetchRecommendations,
  } = useAppStore();

  useEffect(() => {
    fetchAnalyticsSummary();
    fetchStreak();
    fetchAchievements();
    fetchRecommendations();
  }, [fetchAnalyticsSummary, fetchStreak, fetchAchievements, fetchRecommendations]);

  const handleRangeChange = (range: '7days' | '30days' | '1year' | 'all') => {
    setAnalyticsRange(range);
  };

  const categoryColors = {
    transportation: '#00d2ff', // var(--color-transport)
    energy: '#ffd200',         // var(--color-energy)
    food: '#00ff88',           // var(--color-food)
    shopping: '#ff007f',       // var(--color-shopping)
  };

  const totalCO2 = analyticsSummary?.total_co2_kg ?? 0;
  const activityCount = analyticsSummary?.activity_count ?? 0;

  // Formatted category breakdown for Recharts PieChart
  const pieData = analyticsSummary?.category_breakdown
    .filter((c) => c.total_co2_kg > 0)
    .map((c) => ({
      name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
      value: parseFloat(c.total_co2_kg.toFixed(1)),
      color: categoryColors[c.category] || '#64748b',
    })) ?? [];

  // Formatted daily trends for Recharts AreaChart
  const trendData = analyticsSummary?.daily_trends.map((t) => ({
    date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    CO2: parseFloat(t.total_co2_kg.toFixed(1)),
  })) ?? [];

  // Sleek geometric placeholder to replace emojis inside badges
  const renderBadgeIcon = (isEarned: boolean) => {
    const borderStyle = isEarned ? 'border-emerald-500 bg-emerald-950/20 shadow-neon-mint' : 'border-neutral-800 bg-neutral-950/60';
    const dotStyle = isEarned ? 'bg-emerald-400' : 'bg-neutral-700';
    return (
      <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${borderStyle}`} aria-hidden="true">
        <span className={`w-2.5 h-2.5 rounded-full ${dotStyle}`} />
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header section - emoji removed */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-up-fade">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-neutral-100 flex items-center gap-2">
            <span>Hi, {user?.username}</span>
          </h1>
          <p className="text-neutral-450 mt-1 text-sm font-semibold uppercase tracking-wider">
            Emission Summary Console
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex bg-neutral-900 border border-neutral-800 p-1.5 rounded-xl self-start md:self-auto" role="radiogroup" aria-label="Filter analytics by date range">
          {(['7days', '30days', '1year', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => handleRangeChange(range)}
              role="radio"
              aria-checked={analyticsRange === range}
              className={`px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all focus:outline-none ${
                analyticsRange === range
                  ? 'bg-emerald-500 text-neutral-950 shadow-neon-mint'
                  : 'text-neutral-450 hover:text-neutral-100'
              }`}
            >
              {range === '7days' && '7 Days'}
              {range === '30days' && '30 Days'}
              {range === '1year' && '1 Year'}
              {range === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Main stats layout */}
      {analyticsLoading ? (
        <div className="h-64 flex flex-col items-center justify-center animate-pulse" role="status" aria-label="Loading dashboard analytics">
          <div className="spinner border-emerald-500 border-t-transparent animate-spin rounded-full border-4 w-12 h-12"></div>
          <p className="text-neutral-450 mt-4 text-xs font-bold uppercase tracking-wider">Computing emission calculations...</p>
        </div>
      ) : (
        <>
          {/* Top row cards - wrapped in interactive TiltCards, emojis replaced by SVGs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up-fade delay-100">
            {/* Total CO2 Card */}
            <TiltCard className="p-6 flex items-center justify-between border-emerald-500/10" maxTilt={6}>
              <div className="z-10">
                <h2 className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest font-display">Total Carbon Impact</h2>
                <p className="text-4xl font-display font-extrabold text-neutral-50 mt-2 font-mono">
                  {totalCO2.toFixed(1)} <span className="text-xs font-normal text-neutral-450 font-sans tracking-wide">kg CO2</span>
                </p>
                <p className="text-[10px] text-emerald-400 mt-4 flex items-center gap-2 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>EQ: {Math.round(totalCO2 / 0.4)} km driving</span>
                </p>
              </div>
            </TiltCard>

            {/* Streak Card */}
            <TiltCard className="p-6 flex items-center justify-between border-emerald-500/10" maxTilt={6}>
              <div className="z-10">
                <h2 className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest font-display">Logging Streak</h2>
                <p className="text-4xl font-display font-extrabold text-neutral-50 mt-2 font-mono">
                  {streak?.current_streak ?? 0} <span className="text-xs font-normal text-neutral-450 font-sans tracking-wide">days</span>
                </p>
                <p className="text-[10px] text-amber-400 mt-4 font-bold uppercase tracking-wider">
                  <span>MAX RECORD: {streak?.longest_streak ?? 0} DAYS</span>
                </p>
              </div>
            </TiltCard>

            {/* Badges Earned Card */}
            <TiltCard className="p-6 flex items-center justify-between border-emerald-500/10" maxTilt={6}>
              <div className="z-10">
                <h2 className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest font-display">Badges Unlocked</h2>
                <p className="text-4xl font-display font-extrabold text-neutral-50 mt-2 font-mono">
                  {achievements.earned.length} <span className="text-xs font-normal text-neutral-450 font-sans tracking-wide">earned</span>
                </p>
                <p className="text-[10px] text-emerald-400 mt-4 font-bold uppercase tracking-wider">
                  <span>{achievements.available.length} UNLOCKED TIERS LEFT</span>
                </p>
              </div>
            </TiltCard>
          </div>

          {/* Charts layout - wrapped in TiltCards */}
          {activityCount === 0 ? (
            <TiltCard className="p-12 text-center flex flex-col items-center justify-center border-emerald-500/10 animate-slide-up-fade delay-200">
              <h2 className="text-lg font-display font-bold text-neutral-200">No emission logs in range</h2>
              <p className="text-neutral-450 mt-2 max-w-sm text-xs font-semibold leading-relaxed uppercase tracking-wider">
                Log home energy, commutes, foods, or shopping categories to generate console metrics.
              </p>
              <NavLink to="/activities" className="btn-primary mt-6">
                Log First Activity
              </NavLink>
            </TiltCard>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up-fade delay-200">
              {/* Daily Trend Area Chart wrapped in TiltCard */}
              <TiltCard className="p-6 border-emerald-500/10" maxTilt={3} scale={1.005}>
                <h3 className="text-xs font-bold text-neutral-350 uppercase tracking-widest mb-4 font-display">Carbon Trend (CO2 kg)</h3>
                <div className="h-64" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorCO2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#334155" fontSize={10} fontFamily="'Share Tech Mono', monospace" />
                      <YAxis stroke="#334155" fontSize={10} fontFamily="'Share Tech Mono', monospace" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#030704',
                          borderColor: '#10b981',
                          borderRadius: '12px',
                          color: '#f2f7f4',
                          boxShadow: '0 0 15px rgba(0,255,157,0.15)',
                        }}
                      />
                      <Area type="monotone" dataKey="CO2" stroke="#00ff9d" fillOpacity={1} fill="url(#colorCO2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Screen-reader accessible alternative table */}
                <div className="sr-only">
                  <p>Daily CO2 Emission Trend Table:</p>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">CO2 (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendData.map((d, index) => (
                        <tr key={index}>
                          <td>{d.date}</td>
                          <td>{d.CO2} kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TiltCard>

              {/* Category Breakdown Pie Chart wrapped in TiltCard */}
              <TiltCard className="p-6 flex flex-col border-emerald-500/10" maxTilt={3} scale={1.005}>
                <h3 className="text-xs font-bold text-neutral-350 uppercase tracking-widest mb-4 font-display">Emissions by Category</h3>
                <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
                  <div className="h-48 w-48" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={6}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#030704',
                            borderColor: '#10b981',
                            borderRadius: '12px',
                            color: '#f2f7f4',
                            boxShadow: '0 0 15px rgba(0,255,157,0.15)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend list */}
                  <div className="flex-1 space-y-3 w-full">
                    {pieData.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true"></span>
                          <span className="text-neutral-300 font-bold uppercase tracking-wider">{entry.name}</span>
                        </div>
                        <span className="text-neutral-100 font-bold font-mono">{entry.value} kg ({Math.round((entry.value / (totalCO2 || 1)) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Screen-reader accessible alternative table */}
                <div className="sr-only">
                  <p>Category Carbon Breakdown Table:</p>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Category</th>
                        <th scope="col">CO2 (kg)</th>
                        <th scope="col">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pieData.map((entry, index) => (
                        <tr key={index}>
                          <td>{entry.name}</td>
                          <td>{entry.value} kg</td>
                          <td>{Math.round((entry.value / (totalCO2 || 1)) * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TiltCard>
            </div>
          )}

          {/* Quick Recommendations & Badge Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up-fade delay-300">
            {/* Top recommendations quick view */}
            <div className="glass-card p-6 flex flex-col border-emerald-500/10">
              <h3 className="text-xs font-bold text-neutral-350 uppercase tracking-widest mb-4 font-display">
                <span>Recommended Actions</span>
              </h3>
              <div className="space-y-4 flex-1">
                {recommendations.slice(0, 2).map((rec) => (
                  <div key={rec.id} className="p-4 bg-neutral-950/40 border border-emerald-950/10 rounded-2xl hover:border-emerald-500/20 transition-all flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-neutral-100 text-sm font-display tracking-wide">{rec.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          rec.difficulty === 'easy' ? 'badge-easy' : rec.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'
                        }`}>
                          {rec.difficulty.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{rec.description}</p>
                      <p className="text-[10px] text-emerald-400 font-extrabold mt-3 uppercase tracking-wider font-mono">Potential Savings: {rec.potential_savings_kg} kg CO2</p>
                    </div>
                  </div>
                ))}
              </div>
              <NavLink to="/recommendations" className="text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 hover:underline mt-6 self-start transition-colors">
                View Console Registry →
              </NavLink>
            </div>

            {/* Badges unlocked quick view */}
            <div className="glass-card p-6 flex flex-col border-emerald-500/10">
              <h3 className="text-xs font-bold text-neutral-350 uppercase tracking-widest mb-4 font-display">
                <span>Recent Badge Decals</span>
              </h3>
              {achievements.earned.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <svg className="w-8 h-8 text-neutral-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-xs text-neutral-450 uppercase tracking-wider font-semibold max-w-xs leading-relaxed">
                    Achievements unlock automatically as log counts and daily streaks expand.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 flex-1">
                  {achievements.earned.slice(0, 4).map((ua) => (
                    <div key={ua.id} className="p-3 bg-neutral-950/40 border border-emerald-950/10 rounded-xl flex items-center gap-3">
                      {renderBadgeIcon(true)}
                      <div>
                        <h4 className="text-xs font-bold text-neutral-100 font-display">{ua.achievement.name}</h4>
                        <p className="text-[9px] text-neutral-450 mt-1 uppercase tracking-wider font-semibold font-mono">Earned {new Date(ua.earned_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <NavLink to="/achievements" className="text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 hover:underline mt-6 self-start transition-colors">
                Open Showcase Deck →
              </NavLink>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
