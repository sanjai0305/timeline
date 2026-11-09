import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Calendar,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useRoutineStore } from '@/store/routineStore';
import { formatDateRange } from '@/utils/date';
import { backButtonService } from '@/services/backButtonService';

export const MyRoutinesScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    routines,
    fetchRoutines,
    deleteRoutine,
    toggleActive,
  } = useRoutineStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMenuId) return;
    return backButtonService.registerModal(() => {
      setActiveMenuId(null);
      return true;
    });
  }, [activeMenuId]);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const filteredRoutines = routines.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'active'
        ? r.is_active === 1
        : r.is_active === 0;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteRoutine(id);
    }
  };

  const handleToggle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    await toggleActive(id);
  };

  return (
    <div className="min-h-screen bg-background text-text-primary px-5 pt-3 pb-24 flex flex-col justify-between max-w-md mx-auto relative">
      <div>
        {/* Header */}
        <header className="flex items-center justify-between py-2 mb-3">
          <h1 className="text-xl font-bold text-white tracking-tight">My Routines</h1>
          <button
            onClick={() => navigate('/create')}
            className="h-9 px-3.5 rounded-full bg-purple-gradient text-white text-xs font-semibold flex items-center space-x-1.5 shadow-glow-purple-sm active:scale-95 transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New</span>
          </button>
        </header>

        {/* Search Bar */}
        <div className="relative mb-3 flex items-center">
          <div className="absolute left-3.5 text-text-muted pointer-events-none">
            <Search size={17} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search routines..."
            className="w-full h-11 bg-surface border border-white/5 focus:border-brand-purple rounded-2xl pl-10 pr-4 text-xs font-medium text-white placeholder-text-muted focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 mb-4">
          {(['all', 'active', 'inactive'] as const).map((tab) => {
            const isSelected = filter === tab;
            const count =
              tab === 'all'
                ? routines.length
                : tab === 'active'
                ? routines.filter((r) => r.is_active === 1).length
                : routines.filter((r) => r.is_active === 0).length;

            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                  isSelected
                    ? 'bg-brand-purple text-white shadow-glow-pill font-semibold'
                    : 'bg-surface text-text-muted hover:text-white border border-white/5'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Routine Cards List */}
        <div className="space-y-3">
          {filteredRoutines.length > 0 ? (
            filteredRoutines.map((routine) => (
              <div
                key={routine.id}
                onClick={() => navigate(`/routines/${routine.id}`)}
                className="w-full bg-surface hover:bg-[#1E1E36] border border-white/5 hover:border-brand-purple/30 rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.99] relative group"
              >
                <div className="flex items-start justify-between">
                  {/* Left Info */}
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-bold text-sm text-white truncate tracking-tight">
                        {routine.name}
                      </h3>
                      {routine.is_active === 1 ? (
                        <span className="text-[10px] bg-status-success/20 text-status-success font-semibold px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] bg-white/10 text-text-muted font-semibold px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-text-secondary">
                      <span className="flex items-center space-x-1">
                        <Calendar size={13} className="text-brand-purple" />
                        <span>{formatDateRange(routine.start_date, routine.end_date)}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 mt-2 text-[11px] text-brand-accent">
                      <Clock size={12} />
                      <span>{routine.slots.length} daily time slots</span>
                    </div>
                  </div>

                  {/* Kebab Action Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === routine.id ? null : routine.id);
                      }}
                      className="p-1.5 -mr-1 text-text-muted hover:text-white rounded-lg active:scale-90 transition-transform"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {activeMenuId === routine.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                          }}
                        />
                        <div className="absolute right-0 top-8 w-40 bg-[#1F1F38] border border-white/10 rounded-2xl p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              navigate(`/routines/${routine.id}/edit`);
                            }}
                            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-text-primary hover:bg-white/5 transition-colors"
                          >
                            <Pencil size={14} className="text-brand-accent" />
                            <span>Edit Routine</span>
                          </button>

                          <button
                            onClick={(e) => handleToggle(routine.id, e)}
                            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-text-primary hover:bg-white/5 transition-colors"
                          >
                            {routine.is_active === 1 ? (
                              <>
                                <XCircle size={14} className="text-text-muted" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={14} className="text-status-success" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={(e) => handleDelete(routine.id, routine.name, e)}
                            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-status-danger hover:bg-status-danger/10 transition-colors"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            /* Empty State */
            <div className="py-12 px-6 text-center rounded-3xl bg-surface/50 border border-dashed border-white/10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-brand-purple/15 text-brand-accent flex items-center justify-center mb-3 shadow-glow-purple-sm">
                <Calendar size={28} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {search ? 'No matching routines' : 'No routines created yet'}
              </h3>
              <p className="text-xs text-text-muted max-w-[240px] leading-relaxed mb-5">
                {search
                  ? 'Try searching with a different keyword or clear your search.'
                  : 'Create your first daily routine with date range and timetable.'}
              </p>
              <div className="flex flex-col space-y-2.5 w-full max-w-[220px]">
                <button
                  onClick={() => navigate('/create')}
                  className="w-full py-2.5 rounded-xl bg-purple-gradient text-white text-xs font-semibold shadow-glow-purple-sm active:scale-95 transition-all"
                >
                  Create Routine
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
