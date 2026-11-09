import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { apiClient } from './api';
import { TimelineDoc, TimelineEvent, TimelineMember, MemberRole } from '../../api/types/api';

export interface CreateTimelineDto {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  visibility?: 'private' | 'shared' | 'public';
  slots?: any[];
}

export interface CreateEventDto {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  type?: string;
  color?: string;
  status?: 'scheduled' | 'in-progress' | 'completed';
  assignedTo?: string;
  sortOrder?: number;
}

// ---------------- REST API CALLS (Routed to Vercel Backend) ---------------- //

export async function fetchTimelinesApi(): Promise<(TimelineDoc & { role?: string })[]> {
  return apiClient('/api/timelines', { method: 'GET' });
}

export async function fetchTimelineByIdApi(timelineId: string): Promise<TimelineDoc & { role?: string }> {
  return apiClient(`/api/timelines/${timelineId}`, { method: 'GET' });
}

export async function createTimelineApi(data: CreateTimelineDto): Promise<TimelineDoc> {
  return apiClient('/api/timelines', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTimelineApi(timelineId: string, data: Partial<CreateTimelineDto & { isActive?: boolean }>): Promise<TimelineDoc> {
  return apiClient(`/api/timelines/${timelineId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTimelineApi(timelineId: string): Promise<{ id: string }> {
  return apiClient(`/api/timelines/${timelineId}`, { method: 'DELETE' });
}

export async function fetchEventsApi(timelineId: string): Promise<TimelineEvent[]> {
  return apiClient(`/api/timelines/${timelineId}/events`, { method: 'GET' });
}

export async function createEventApi(timelineId: string, eventData: CreateEventDto): Promise<TimelineEvent> {
  return apiClient(`/api/timelines/${timelineId}/events`, {
    method: 'POST',
    body: JSON.stringify(eventData),
  });
}

export async function updateEventApi(timelineId: string, eventId: string, eventData: Partial<CreateEventDto>): Promise<TimelineEvent> {
  return apiClient(`/api/timelines/${timelineId}/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(eventData),
  });
}

export async function deleteEventApi(timelineId: string, eventId: string): Promise<{ id: string }> {
  return apiClient(`/api/timelines/${timelineId}/events/${eventId}`, { method: 'DELETE' });
}

export async function fetchMembersApi(timelineId: string): Promise<TimelineMember[]> {
  return apiClient(`/api/timelines/${timelineId}/members`, { method: 'GET' });
}

export async function inviteMemberApi(timelineId: string, email: string, role: MemberRole = 'editor'): Promise<TimelineMember> {
  return apiClient(`/api/timelines/${timelineId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function updateMemberRoleApi(timelineId: string, userId: string, role: MemberRole): Promise<TimelineMember> {
  return apiClient(`/api/timelines/${timelineId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function removeMemberApi(timelineId: string, userId: string): Promise<{ userId: string }> {
  return apiClient(`/api/timelines/${timelineId}/members/${userId}`, { method: 'DELETE' });
}

// ---------------- REAL-TIME FIRESTORE SUBSCRIPTIONS ---------------- //

/**
 * Real-time listener for all timelines where the user is a member
 */
export function subscribeToUserTimelines(
  userId: string,
  onData: (timelines: TimelineDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(firestore, 'timelines'),
    where('memberIds', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const timelines: TimelineDoc[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      }));
      onData(timelines);
    },
    (err) => {
      console.warn('[Firestore Real-time Timelines Error]:', err);
      onError?.(err);
    }
  );
}

/**
 * Real-time listener for a single timeline document
 */
export function subscribeToTimeline(
  timelineId: string,
  onData: (timeline: TimelineDoc | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(firestore, 'timelines', timelineId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onData({ id: docSnap.id, ...(docSnap.data() as any) });
      } else {
        onData(null);
      }
    },
    (err) => {
      console.warn('[Firestore Real-time Timeline Doc Error]:', err);
      onError?.(err);
    }
  );
}

/**
 * Real-time listener for events within a timeline
 */
export function subscribeToTimelineEvents(
  timelineId: string,
  onData: (events: TimelineEvent[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const eventsCol = collection(firestore, 'timelines', timelineId, 'events');
  const q = query(eventsCol, orderBy('sortOrder', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const events: TimelineEvent[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        timelineId,
        ...(docSnap.data() as any),
      }));
      onData(events);
    },
    (err) => {
      console.warn('[Firestore Real-time Events Error]:', err);
      onError?.(err);
    }
  );
}

/**
 * Real-time listener for members within a timeline
 */
export function subscribeToTimelineMembers(
  timelineId: string,
  onData: (members: TimelineMember[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const membersCol = collection(firestore, 'timelines', timelineId, 'members');

  return onSnapshot(
    membersCol,
    (snapshot) => {
      const members: TimelineMember[] = snapshot.docs.map((docSnap) => docSnap.data() as TimelineMember);
      onData(members);
    },
    (err) => {
      console.warn('[Firestore Real-time Members Error]:', err);
      onError?.(err);
    }
  );
}

