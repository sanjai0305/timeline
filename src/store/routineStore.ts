import { create } from 'zustand';
import { RoutineWithSlots, CreateRoutineInput, UpdateRoutineInput, RoutineStats } from '@/models/routine';
import { getRoutineRepository } from '@/database';
import { auth } from '@/services/firebase';
import {
  fetchTimelinesApi,
  createTimelineApi,
  updateTimelineApi,
  deleteTimelineApi,
  fetchEventsApi,
  fetchMembersApi,
  inviteMemberApi,
  updateMemberRoleApi,
  removeMemberApi,
  subscribeToTimelineEvents,
  subscribeToTimelineMembers,
} from '@/services/timelineApi';
import { TimelineMember, MemberRole, TimelineEvent } from '@/types/api';
import { sortSlotsByStartTime, calculateActiveDays } from '@/utils/date';
import { CategoryId } from '@/models/category';
import { notificationService } from '@/services/notificationService';

interface RoutineState {
  routines: RoutineWithSlots[];
  selectedRoutine: RoutineWithSlots | null;
  selectedMembers: TimelineMember[];
  activeTimelineRole: MemberRole;
  stats: RoutineStats;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filter: 'all' | 'active' | 'inactive';

  // Core Actions
  fetchRoutines: () => Promise<void>;
  fetchRoutineById: (id: string) => Promise<RoutineWithSlots | null>;
  createRoutine: (input: CreateRoutineInput) => Promise<RoutineWithSlots>;
  updateRoutine: (id: string, input: UpdateRoutineInput) => Promise<RoutineWithSlots>;
  deleteRoutine: (id: string) => Promise<boolean>;
  toggleActive: (id: string) => Promise<boolean>;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: 'all' | 'active' | 'inactive') => void;
  resetDatabase: () => Promise<void>;

  // Collaborative Actions
  fetchMembers: (timelineId: string) => Promise<void>;
  inviteMember: (timelineId: string, email: string, role?: MemberRole) => Promise<TimelineMember>;
  updateMemberRole: (timelineId: string, userId: string, role: MemberRole) => Promise<void>;
  removeMember: (timelineId: string, userId: string) => Promise<void>;
  subscribeToRealtimeTimeline: (timelineId: string) => () => void;
}

// In-flight request deduplication cache for collaborative members
let activeFetchTimelineId: string | null = null;
let activeFetchPromise: Promise<void> | null = null;

export const useRoutineStore = create<RoutineState>((set, get) => ({
  routines: [],
  selectedRoutine: null,
  selectedMembers: [],
  activeTimelineRole: 'owner',
  stats: {
    totalRoutines: 0,
    totalTimeSlots: 0,
    activeDays: 0,
  },
  isLoading: false,
  error: null,
  searchQuery: '',
  filter: 'all',

  fetchRoutines: async () => {
    set({ isLoading: true, error: null });

    // 1. If user is authenticated, query Cloud Backend
    if (auth.currentUser) {
      try {
        const cloudTimelines = await fetchTimelinesApi();
        const routinesWithSlots: RoutineWithSlots[] = [];

        for (const t of cloudTimelines) {
          let events: TimelineEvent[] = [];
          try {
            events = await fetchEventsApi(t.id);
          } catch {
            events = [];
          }

          routinesWithSlots.push({
            id: t.id,
            name: t.name,
            start_date: t.startDate,
            end_date: t.endDate,
            is_active: t.isActive ? 1 : 0,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            role: (t.role as MemberRole) || (t.ownerId === auth.currentUser.uid ? 'owner' : 'viewer'),
            ownerId: t.ownerId,
            memberIds: t.memberIds,
            visibility: t.visibility,
            slots: sortSlotsByStartTime(
              events.map((e) => ({
                id: e.id,
                routine_id: t.id,
                start_time: e.startTime,
                end_time: e.endTime,
                activity_name: e.title,
                category: (e.type as CategoryId) || 'study',
                icon: e.color || 'Clock',
                sort_order: e.sortOrder,
                created_at: e.createdAt,
                updated_at: e.updatedAt,
              }))
            ),
          });
        }

        // Calculate stats
        let totalSlots = 0;
        routinesWithSlots.forEach((r) => {
          totalSlots += r.slots.length;
        });
        const activeDays = calculateActiveDays(routinesWithSlots);

        set({
          routines: routinesWithSlots,
          stats: {
            totalRoutines: routinesWithSlots.length,
            totalTimeSlots: totalSlots,
            activeDays,
          },
          isLoading: false,
        });
        return;
      } catch (err: any) {
        console.warn('[Store] Cloud fetch failed, falling back to local database:', err.message);
      }
    }

    // 2. Fallback to Local Repository
    try {
      const repo = await getRoutineRepository();
      const routines = await repo.getAllRoutines();
      const stats = await repo.getStats();
      set({ routines, stats, isLoading: false });
    } catch (err: any) {
      console.error('Error fetching routines:', err);
      set({ error: err.message || 'Failed to fetch routines', isLoading: false });
    }
  },

  fetchRoutineById: async (id: string) => {
    // 1. Check existing in-memory state
    const existing = get().routines.find((r) => r.id === id);
    if (existing) {
      set({ selectedRoutine: existing, activeTimelineRole: existing.role || 'owner' });
    }

    // 2. If authenticated, fetch from Cloud API
    if (auth.currentUser) {
      try {
        const events = await fetchEventsApi(id);
        const members = await fetchMembersApi(id);

        set((state) => {
          if (!state.selectedRoutine || state.selectedRoutine.id !== id) {
            return { selectedMembers: members };
          }
          const updatedSlots = sortSlotsByStartTime(
            events.map((e) => ({
              id: e.id,
              routine_id: id,
              start_time: e.startTime,
              end_time: e.endTime,
              activity_name: e.title,
              category: (e.type as CategoryId) || 'study',
              icon: e.color || 'Clock',
              sort_order: e.sortOrder,
              created_at: e.createdAt,
              updated_at: e.updatedAt,
            }))
          );

          return {
            selectedRoutine: { ...state.selectedRoutine, slots: updatedSlots },
            selectedMembers: members,
          };
        });
      } catch (err) {
        console.warn('[Store] Could not fetch remote events/members:', err);
      }
    }

    // 3. Fallback to local repository if still null
    if (!get().selectedRoutine) {
      try {
        const repo = await getRoutineRepository();
        const routine = await repo.getRoutineById(id);
        if (routine) {
          set({ selectedRoutine: routine, activeTimelineRole: 'owner' });
        }
        return routine;
      } catch (err: any) {
        console.error('Error fetching routine by id:', err);
        return null;
      }
    }

    return get().selectedRoutine;
  },

  createRoutine: async (input: CreateRoutineInput) => {
    set({ isLoading: true, error: null });

    // 1. If authenticated, create via Cloud API
    if (auth.currentUser) {
      try {
        const createdTimeline = await createTimelineApi({
          name: input.name,
          startDate: input.start_date,
          endDate: input.end_date,
          slots: input.slots,
        });

        await get().fetchRoutines();
        const found = get().routines.find((r) => r.id === createdTimeline.id);
        const result = found || {
          id: createdTimeline.id,
          name: createdTimeline.name,
          start_date: createdTimeline.startDate,
          end_date: createdTimeline.endDate,
          is_active: 1,
          created_at: createdTimeline.createdAt,
          updated_at: createdTimeline.updatedAt,
          role: 'owner',
          slots: input.slots ? input.slots.map((s, i) => ({
            ...s,
            id: `cloud_slot_${i}`,
            routine_id: createdTimeline.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })) : [],
        };

        if (result.is_active === 1) {
          notificationService.scheduleRoutineReminders(result).catch((e) =>
            console.warn('[Store] Failed to schedule reminders for cloud routine:', e)
          );
        }

        set({ selectedRoutine: result, isLoading: false });
        return result;
      } catch (err: any) {
        console.warn('[Store] Cloud creation failed, falling back to local SQLite:', err);
      }
    }

    // 2. Local database fallback
    try {
      const repo = await getRoutineRepository();
      const created = await repo.createRoutine(input);
      await get().fetchRoutines();
      set({ selectedRoutine: created, isLoading: false });

      if (created.is_active === 1) {
        notificationService.scheduleRoutineReminders(created).catch((e) =>
          console.warn('[Store] Failed to schedule reminders:', e)
        );
      }

      return created;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create routine', isLoading: false });
      throw err;
    }
  },

  updateRoutine: async (id: string, input: UpdateRoutineInput) => {
    set({ isLoading: true, error: null });

    if (auth.currentUser) {
      try {
        await updateTimelineApi(id, {
          name: input.name,
          startDate: input.start_date,
          endDate: input.end_date,
          isActive: input.is_active,
        });

        await get().fetchRoutines();
        const updated = get().routines.find((r) => r.id === id) || null;
        set({ selectedRoutine: updated, isLoading: false });
        if (updated) {
          if (updated.is_active === 1) {
            notificationService.scheduleRoutineReminders(updated).catch((e) =>
              console.warn('[Store] Failed to schedule reminders:', e)
            );
          } else {
            notificationService.cancelRoutineReminders(id).catch((e) =>
              console.warn('[Store] Failed to cancel reminders:', e)
            );
          }
          return updated;
        }
      } catch (err: any) {
        console.warn('[Store] Cloud update failed, falling back to local DB:', err);
      }
    }

    try {
      const repo = await getRoutineRepository();
      const updated = await repo.updateRoutine(id, input);
      await get().fetchRoutines();
      set({ selectedRoutine: updated, isLoading: false });

      if (updated.is_active === 1) {
        notificationService.scheduleRoutineReminders(updated).catch((e) =>
          console.warn('[Store] Failed to schedule reminders:', e)
        );
      } else {
        notificationService.cancelRoutineReminders(id).catch((e) =>
          console.warn('[Store] Failed to cancel reminders:', e)
        );
      }

      return updated;
    } catch (err: any) {
      set({ error: err.message || 'Failed to update routine', isLoading: false });
      throw err;
    }
  },

  deleteRoutine: async (id: string) => {
    if (auth.currentUser) {
      try {
        await deleteTimelineApi(id);
        notificationService.cancelRoutineReminders(id).catch((e) =>
          console.warn('[Store] Failed to cancel reminders:', e)
        );
        if (get().selectedRoutine?.id === id) {
          set({ selectedRoutine: null });
        }
        await get().fetchRoutines();
        return true;
      } catch (err: any) {
        console.warn('[Store] Cloud delete failed, attempting local delete:', err);
      }
    }

    try {
      const repo = await getRoutineRepository();
      const success = await repo.deleteRoutine(id);
      if (success) {
        notificationService.cancelRoutineReminders(id).catch((e) =>
          console.warn('[Store] Failed to cancel reminders:', e)
        );
        if (get().selectedRoutine?.id === id) {
          set({ selectedRoutine: null });
        }
        await get().fetchRoutines();
      }
      return success;
    } catch (err: any) {
      console.error('Error deleting routine:', err);
      return false;
    }
  },

  toggleActive: async (id: string) => {
    const routine = get().routines.find((r) => r.id === id);
    if (!routine) return false;
    const newActiveState = routine.is_active !== 1;

    if (auth.currentUser) {
      try {
        await updateTimelineApi(id, { isActive: newActiveState });
        await get().fetchRoutines();
        return true;
      } catch (err) {
        console.warn('[Store] Cloud toggle active failed:', err);
      }
    }

    try {
      const repo = await getRoutineRepository();
      await repo.toggleRoutineActive(id, newActiveState);
      await get().fetchRoutines();

      if (newActiveState) {
        const target = get().routines.find((r) => r.id === id);
        if (target) {
          notificationService.scheduleRoutineReminders({ ...target, is_active: 1 }).catch((e) =>
            console.warn('[Store] Failed to schedule reminders:', e)
          );
        }
      } else {
        notificationService.cancelRoutineReminders(id).catch((e) =>
          console.warn('[Store] Failed to cancel reminders:', e)
        );
      }

      if (get().selectedRoutine?.id === id) {
        set((state) => ({
          selectedRoutine: state.selectedRoutine
            ? { ...state.selectedRoutine, is_active: newActiveState ? 1 : 0 }
            : null,
        }));
      }
      return true;
    } catch (err) {
      console.error('Error toggling routine active state:', err);
      return false;
    }
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setFilter: (filter: 'all' | 'active' | 'inactive') => set({ filter }),

  resetDatabase: async () => {
    notificationService.cancelAllReminders().catch((e: any) =>
      console.warn('[Store] Failed to cancel all reminders:', e)
    );
    const repo = await getRoutineRepository();
    await repo.clearAllData();
    set({
      routines: [],
      selectedRoutine: null,
      selectedMembers: [],
      stats: { totalRoutines: 0, totalTimeSlots: 0, activeDays: 0 },
    });
  },

  // Collaborative Methods
  fetchMembers: async (timelineId: string) => {
    if (!timelineId) {
      set({ selectedMembers: [] });
      return;
    }

    // Deduplicate concurrent in-flight requests for the same timeline
    if (activeFetchTimelineId === timelineId && activeFetchPromise) {
      return activeFetchPromise;
    }

    activeFetchTimelineId = timelineId;
    activeFetchPromise = (async () => {
      try {
        const members = await fetchMembersApi(timelineId);
        set({ selectedMembers: Array.isArray(members) ? members : [] });
      } catch (err: any) {
        console.warn('[Store] Could not fetch members:', err);
        set({ selectedMembers: [] });
        throw err;
      } finally {
        activeFetchTimelineId = null;
        activeFetchPromise = null;
      }
    })();

    return activeFetchPromise;
  },

  inviteMember: async (timelineId: string, email: string, role: MemberRole = 'editor') => {
    const member = await inviteMemberApi(timelineId, email, role);
    set((state) => ({
      selectedMembers: [...state.selectedMembers.filter((m) => m.userId !== member.userId), member],
    }));
    return member;
  },

  updateMemberRole: async (timelineId: string, userId: string, role: MemberRole) => {
    await updateMemberRoleApi(timelineId, userId, role);
    set((state) => ({
      selectedMembers: state.selectedMembers.map((m) =>
        m.userId === userId ? { ...m, role } : m
      ),
    }));
  },

  removeMember: async (timelineId: string, userId: string) => {
    await removeMemberApi(timelineId, userId);
    set((state) => ({
      selectedMembers: state.selectedMembers.filter((m) => m.userId !== userId),
    }));
  },

  subscribeToRealtimeTimeline: (timelineId: string) => {
    // 1. Subscribe to events
    const unsubEvents = subscribeToTimelineEvents(timelineId, (events) => {
      set((state) => {
        if (!state.selectedRoutine || state.selectedRoutine.id !== timelineId) return {};

        const updatedSlots = sortSlotsByStartTime(
          events.map((e) => ({
            id: e.id,
            routine_id: timelineId,
            start_time: e.startTime,
            end_time: e.endTime,
            activity_name: e.title,
            category: (e.type as CategoryId) || 'study',
            icon: e.color || 'Clock',
            sort_order: e.sortOrder,
            created_at: e.createdAt,
            updated_at: e.updatedAt,
          }))
        );

        return {
          selectedRoutine: {
            ...state.selectedRoutine,
            slots: updatedSlots,
          },
        };
      });
    });

    // 2. Subscribe to members
    const unsubMembers = subscribeToTimelineMembers(timelineId, (members) => {
      set({ selectedMembers: members });
    });

    return () => {
      unsubEvents();
      unsubMembers();
    };
  },
}));
