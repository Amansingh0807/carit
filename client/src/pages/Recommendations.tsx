import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TiltCard } from '../components/TiltCard';

export const Recommendations: React.FC = () => {
  const { recommendations, recommendationsLoading, fetchRecommendations } = useAppStore();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [activeRecommendationId, setActiveRecommendationId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleTakeAction = (id: string, title: string) => {
    setActiveRecommendationId(id);
    setActionSuccessMessage(`Eco-Mission Initiated! You are acting on "${title}". Let's start log-tracking this sustainable behavior in your Carbon Logs.`);
    setTimeout(() => {
      setActionSuccessMessage(null);
      setActiveRecommendationId(null);
    }, 6000);
  };

  const filteredRecommendations = recommendations.filter((rec) => {
    const matchDiff = !selectedDifficulty || rec.difficulty === selectedDifficulty;
    const matchCat = !selectedCategory || rec.category === selectedCategory;
    return matchDiff && matchCat;
  });

  const renderCategoryIcon = (category: string) => {
    const colors: Record<string, string> = {
      transportation: 'text-sky-400 border-sky-500/25 bg-sky-500/5',
      energy: 'text-amber-400 border-amber-500/25 bg-amber-500/5',
      food: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5',
      shopping: 'text-fuchsia-400 border-fuchsia-500/25 bg-fuchsia-500/5',
    };
    return (
      <div className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-extrabold uppercase tracking-widest font-display ${colors[category] || 'text-neutral-450 border-neutral-800 bg-neutral-900/40'}`}>
        {category.substring(0, 3)}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-neutral-100">
          Eco Recommendations
        </h1>
        <p className="text-neutral-450 mt-1 text-sm font-semibold uppercase tracking-wider">
          Suggested action plans to reduce carbon footprint
        </p>
      </div>

      {/* Interactive alert banner */}
      {actionSuccessMessage && (
        <div
          className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center justify-between shadow-neon-mint"
          role="alert"
          aria-live="polite"
        >
          <span>{actionSuccessMessage}</span>
          <button onClick={() => setActionSuccessMessage(null)} className="text-[10px] font-extrabold text-neutral-400 hover:text-neutral-200">Dismiss</button>
        </div>
      )}

      {/* Filters Bar - emojis removed */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-emerald-500/10">
        <h2 className="text-xs font-bold text-neutral-350 uppercase tracking-widest font-display">Filter Suggestions</h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Difficulty filter */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <label htmlFor="filter-diff" className="text-xs text-neutral-450 font-bold uppercase tracking-wider whitespace-nowrap">Difficulty:</label>
            <select
              id="filter-diff"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-semibold rounded-lg px-3 py-2 w-full sm:w-32 focus:outline-none"
            >
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <label htmlFor="filter-cat" className="text-xs text-neutral-450 font-bold uppercase tracking-wider whitespace-nowrap">Category:</label>
            <select
              id="filter-cat"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-semibold rounded-lg px-3 py-2 w-full sm:w-44 focus:outline-none"
            >
              <option value="">All</option>
              <option value="transportation">Transportation</option>
              <option value="energy">Energy</option>
              <option value="food">Diet & Food</option>
              <option value="shopping">Shopping</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations Grid */}
      {recommendationsLoading ? (
        <div className="h-64 flex flex-col items-center justify-center animate-pulse" role="status" aria-label="Loading carbon recommendations">
          <div className="spinner border-emerald-500 border-t-transparent animate-spin rounded-full border-4 w-12 h-12"></div>
          <p className="text-neutral-450 mt-4 text-xs font-bold uppercase tracking-wider">Generating eco action plans...</p>
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <div className="glass-card p-12 text-center border-emerald-500/10">
          <h3 className="text-sm font-bold text-neutral-350 uppercase tracking-widest font-display">No matches</h3>
          <p className="text-xs text-neutral-500 mt-1.5 font-semibold uppercase tracking-wider">Try clearing filters or log more emission data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecommendations.map((rec) => {
            return (
              <TiltCard
                key={rec.id}
                className="p-6 flex flex-col justify-between border-emerald-500/10"
                maxTilt={4}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    {renderCategoryIcon(rec.category)}
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        rec.difficulty === 'easy' ? 'badge-easy' : rec.difficulty === 'medium' ? 'badge-medium' : 'badge-hard'
                      }`}>
                        {rec.difficulty}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-neutral-100 mt-4 font-display tracking-wide">
                    {rec.title}
                  </h3>
                  
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                    {rec.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[9px] text-neutral-450 font-bold uppercase tracking-wider block font-display">Potential Savings</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {rec.potential_savings_kg > 0 ? `${rec.potential_savings_kg} kg CO₂ / action` : 'Continuous reduction'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleTakeAction(rec.id, rec.title)}
                    disabled={activeRecommendationId === rec.id}
                    className="btn-primary px-3.5 py-2 text-[10px] font-bold"
                  >
                    {activeRecommendationId === rec.id ? 'Working...' : 'Commit to Action'}
                  </button>
                </div>
              </TiltCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
