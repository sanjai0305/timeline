import { Request, Response, NextFunction } from 'express';
import { db } from '../config/firebaseAdmin';
import { MemberRole } from '../types/api';

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export function requireTimelineRole(minRole: MemberRole = 'viewer') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const timelineId = req.params.timelineId as string;
    const userId = req.user?.uid;

    if (!timelineId) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Missing timelineId parameter' },
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
      return;
    }

    try {
      // 1. Fetch Timeline Document
      const timelineRef = db.collection('timelines').doc(timelineId);
      const timelineSnap = await timelineRef.get();

      if (!timelineSnap.exists) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Timeline with ID ${timelineId} not found` },
        });
        return;
      }

      const timelineData = timelineSnap.data() as any;

      // 2. Check if user is the direct owner
      let userRole: MemberRole | null = null;

      if (timelineData.ownerId === userId) {
        userRole = 'owner';
      } else {
        // 3. Check membership subcollection: timelines/{timelineId}/members/{userId}
        const memberRef = timelineRef.collection('members').doc(userId);
        const memberSnap = await memberRef.get();

        if (memberSnap.exists) {
          const memberData = memberSnap.data();
          if (memberData?.status === 'active') {
            userRole = (memberData.role as MemberRole) || 'viewer';
          }
        }
      }

      // Check if timeline is public and action is only viewing
      if (!userRole && timelineData.visibility === 'public' && minRole === 'viewer') {
        userRole = 'viewer';
      }

      if (!userRole) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not a member of this timeline and cannot access it.',
          },
        });
        return;
      }

      // 4. Validate Role Hierarchy
      const userRank = ROLE_HIERARCHY[userRole] || 0;
      const minRank = ROLE_HIERARCHY[minRole] || 1;

      if (userRank < minRank) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Your role (${userRole}) is not permitted to perform this action. Minimum required: ${minRole}.`,
          },
        });
        return;
      }

      // Attach context to request
      req.timelineRole = userRole;
      req.timeline = { id: timelineSnap.id, ...timelineData };
      next();
    } catch (err: any) {
      console.error('[Membership Middleware] Error checking permissions:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while verifying timeline permissions.',
        },
      });
    }
  };
}
