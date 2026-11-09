export type MemberRole = 'owner' | 'editor' | 'viewer';
export type MemberStatus = 'active' | 'invited';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineMember {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
}

export interface TimelineEvent {
  id: string;
  timelineId: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: string; // e.g. "05:00 AM"
  endTime: string;   // e.g. "06:00 AM"
  type: string;      // study, exercise, meal, etc.
  color?: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  createdBy: string;
  assignedTo?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineDoc {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  ownerId: string;
  memberIds: string[];
  visibility: 'private' | 'shared' | 'public';
  createdAt: string;
  updatedAt: string;
}

