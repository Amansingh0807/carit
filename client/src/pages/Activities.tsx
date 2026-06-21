import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TiltCard } from '../components/TiltCard';
import type { ActivityCategory, ActivityInput, Activity } from '../types';

export const Activities: React.FC = () => {
  const {
    activities,
    totalActivities,
    currentPage,
    activitiesLimit,
    activityLoading,
    activityError,
    fetchActivities,
    logActivity,
    updateActivity,
    deleteActivity,
    emissionFactors,
    fetchEmissionFactors,
  } = useAppStore();

  // Form State
  const [category, setCategory] = useState<ActivityCategory>('transportation');
  const [activityType, setActivityType] = useState('');
  const [value, setValue] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Edit Mode state
  const [editingId, setEditingId] = useState<number | null>(null);

  // Table filtering
  const [filterCategory, setFilterCategory] = useState<string>('');

  useEffect(() => {
    fetchEmissionFactors();
    fetchActivities(1, 10, filterCategory || undefined);
  }, [filterCategory, fetchEmissionFactors, fetchActivities]);

  // Update activity types when category changes
  const categoryFactors = useMemo(() => {
    return emissionFactors.filter((ef) => ef.category === category);
  }, [emissionFactors, category]);

  useEffect(() => {
    if (categoryFactors.length > 0) {
      setActivityType(categoryFactors[0].activity_type);
      setUnit(categoryFactors[0].unit);
    }
  }, [categoryFactors]);

  // Update unit when activityType changes
  const selectedFactor = useMemo(() => {
    return emissionFactors.find((ef) => ef.activity_type === activityType);
  }, [emissionFactors, activityType]);

  useEffect(() => {
    if (selectedFactor) {
      setUnit(selectedFactor.unit);
    }
  }, [selectedFactor]);

  // Live CO2 preview
  const liveCO2Preview = () => {
    if (value === '' || isNaN(Number(value))) return 0;
    if (!selectedFactor) return 0;
    return Number((selectedFactor.factor * Number(value)).toFixed(2));
  };

  const handleEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setCategory(activity.category);
    setTimeout(() => {
      setActivityType(activity.activity_type);
      setValue(activity.value);
      setDescription(activity.description ?? '');
      setDate(activity.date);
    }, 0);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCategory('transportation');
    setValue('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (value === '' || Number(value) <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    const payload: ActivityInput = {
      category,
      activity_type: activityType,
      value: Number(value),
      unit,
      description: description.trim() || undefined,
      date,
    };

    try {
      if (editingId) {
        await updateActivity(editingId, payload);
        setEditingId(null);
      } else {
        await logActivity(payload);
      }
      setValue('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch {
      // Handled by store
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      await deleteActivity(id);
    }
  };

  const renderCategoryDot = (cat: ActivityCategory) => {
    const colors = {
      transportation: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]',
      energy: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
      food: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
      shopping: 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.5)]',
    };
    return (
      <span className={`w-2.5 h-2.5 rounded-full inline-block mr-2 ${colors[cat] || 'bg-neutral-400'}`} aria-hidden="true" />
    );
  };

  const totalPages = Math.ceil(totalActivities / activitiesLimit);

  return (
    <div className="space-y-8 animate-slide-up-fade">
      <div>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-neutral-100">
          Carbon Logs
        </h1>
        <p className="text-neutral-450 mt-1 text-sm font-semibold uppercase tracking-wider">
          Estimate and record daily carbon output
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Card */}
        <TiltCard className="lg:col-span-4 p-6 border-emerald-500/10" maxTilt={3}>
          <h2 className="text-lg font-display font-bold text-neutral-100 mb-5">
            {editingId ? 'Edit Activity Log' : 'Log New Activity'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {activityError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold uppercase tracking-wider" role="alert" aria-live="polite">
                {activityError}
              </div>
            )}

            {/* Category selection */}
            <div>
              <label htmlFor="form-category" className="block text-[10px] font-bold text-neutral-350 uppercase tracking-widest mb-2 font-display">
                Category
              </label>
              <select
                id="form-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="input-field py-2.5 text-sm font-semibold"
              >
                <option value="transportation">Transportation</option>
                <option value="energy">Home Energy</option>
                <option value="food">Diet & Food</option>
                <option value="shopping">Shopping & Goods</option>
              </select>
            </div>

            {/* Activity Type selection */}
            <div>
              <label htmlFor="form-type" className="block text-[10px] font-bold text-neutral-350 uppercase tracking-widest mb-2 font-display">
                Activity Type
              </label>
              <select
                id="form-type"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="input-field py-2.5 text-sm font-semibold"
              >
                {categoryFactors.map((ef) => (
                  <option key={ef.activity_type} value={ef.activity_type}>
                    {ef.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Value (Quantity) input */}
            <div>
              <label htmlFor="form-value" className="block text-[10px] font-bold text-neutral-350 uppercase tracking-widest mb-2 font-display">
                Quantity
              </label>
              <div className="relative">
                <input
                  id="form-value"
                  type="number"
                  step="any"
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.0"
                  className="input-field pr-16 text-sm font-semibold"
                  aria-required="true"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-bold uppercase tracking-wider font-display" aria-hidden="true">
                  {unit}
                </span>
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label htmlFor="form-date" className="block text-[10px] font-bold text-neutral-350 uppercase tracking-widest mb-2 font-display">
                Date
              </label>
              <input
                id="form-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field text-sm font-semibold"
                aria-required="true"
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <label htmlFor="form-desc" className="block text-[10px] font-bold text-neutral-350 uppercase tracking-widest mb-2 font-display">
                Description <span className="text-[9px] text-neutral-500 font-normal lowercase">(optional)</span>
              </label>
              <input
                id="form-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Commute, grocery run"
                className="input-field text-sm font-semibold"
              />
            </div>

            {/* Live carbon estimation display - emoji removed */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between shadow-neon-mint">
              <div>
                <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-widest block font-display">Estimated Carbon</span>
                <p className="text-2xl font-display font-extrabold text-emerald-400 mt-0.5 font-mono">
                  {liveCO2Preview()} <span className="text-xs font-bold text-neutral-300 font-sans tracking-wide">kg CO2</span>
                </p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-neon-mint"></span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={activityLoading}
                className="btn-primary flex-1 justify-center py-2.5 text-xs font-bold"
              >
                {activityLoading ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="spinner border-neutral-950 border-t-transparent w-3.5 h-3.5"></span>
                    Saving...
                  </span>
                ) : editingId ? (
                  'Update Log'
                ) : (
                  'Add Log Entry'
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-secondary px-4 py-2.5 text-xs font-bold"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </TiltCard>

        {/* Right Column: Logged Activities List & History */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Filtering bar - emojis removed */}
          <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-emerald-500/10">
            <h3 className="text-xs font-bold text-neutral-350 uppercase tracking-widest font-display">History Log</h3>
            
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <label htmlFor="filter-category" className="text-xs text-neutral-450 font-bold uppercase tracking-wider whitespace-nowrap">Filter By:</label>
              <select
                id="filter-category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-semibold rounded-lg px-3 py-2 w-full sm:w-44 focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="transportation">Transportation</option>
                <option value="energy">Energy</option>
                <option value="food">Diet & Food</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>
          </div>

          {/* Activities list / table */}
          {activities.length === 0 ? (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-emerald-500/10">
              <h3 className="text-sm font-bold text-neutral-350 uppercase tracking-widest font-display">No logs recorded</h3>
              <p className="text-xs text-neutral-500 mt-1.5 font-semibold uppercase tracking-wider max-w-xs leading-relaxed">
                Log quantities using the form on the left to start populate logs.
              </p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden border-emerald-500/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" role="table">
                  <caption className="sr-only">List of logged carbon activities with date, details, value and calculated CO2 emissions.</caption>
                  <thead>
                    <tr className="bg-neutral-900/60 border-b border-neutral-800 text-neutral-405 text-[10px] font-bold uppercase tracking-wider">
                      <th scope="col" className="px-6 py-4">Date</th>
                      <th scope="col" className="px-6 py-4">Activity</th>
                      <th scope="col" className="px-6 py-4">Amount</th>
                      <th scope="col" className="px-6 py-4">Emissions</th>
                      <th scope="col" className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-xs">
                    {activities.map((act) => {
                      const typeLabel = emissionFactors.find((ef) => ef.activity_type === act.activity_type)?.label ?? act.activity_type;

                      return (
                        <tr key={act.id} className="hover:bg-neutral-900/40 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-neutral-300 font-mono">
                            {new Date(act.date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-100 flex items-center font-display tracking-wide">
                                {renderCategoryDot(act.category)}
                                <span>{typeLabel}</span>
                              </span>
                              {act.description && (
                                <span className="text-[10px] text-neutral-500 italic mt-1 font-semibold">{act.description}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-neutral-300 font-bold font-mono">
                            {act.value} <span className="text-[10px] text-neutral-500 font-sans tracking-wide">{act.unit}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-400 font-mono">
                            {act.co2_kg.toFixed(2)} kg CO2
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-[10px] font-extrabold uppercase tracking-wider">
                            <div className="flex items-center justify-end gap-3.5">
                              <button
                                onClick={() => handleEdit(act)}
                                className="text-neutral-400 hover:text-emerald-400 font-bold transition-colors"
                                aria-label={`Edit ${typeLabel} logged on ${act.date}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(act.id)}
                                className="text-rose-500 hover:text-rose-450 font-bold transition-colors"
                                aria-label={`Delete ${typeLabel} logged on ${act.date}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-neutral-900/30 border-t border-neutral-900 flex items-center justify-between gap-4">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
                    Showing page {currentPage} of {totalPages}
                  </span>
                  
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => fetchActivities(currentPage - 1, activitiesLimit, filterCategory || undefined)}
                      disabled={currentPage === 1}
                      className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-extrabold uppercase tracking-wider rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => fetchActivities(currentPage + 1, activitiesLimit, filterCategory || undefined)}
                      disabled={currentPage === totalPages}
                      className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-extrabold uppercase tracking-wider rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
