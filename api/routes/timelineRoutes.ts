import { Router, Request, Response } from 'express';
import { db } from '../config/firebaseAdmin';
import { requireAuth } from '../middleware/auth';
import { requireTimelineRole } from '../middleware/membership';
import { TimelineDoc, TimelineMember } from '../types/api';

const router = Router();

// Apply auth to all timeline routes
router.use(requireAuth);

// GET /api/timelines - get all timelines the user has access to
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.uid;

  try {
    // Query timelines where memberIds contains the authenticated userId
    const snapshot = await db
      .collection('timelines')
      .where('memberIds', 'array-contains', userId)
      .get();

    const timelines: (TimelineDoc & { role?: string })[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data() as TimelineDoc;
      let userRole = data.ownerId === userId ? 'owner' : 'viewer';

      // Check role in subcollection if not owner
      if (data.ownerId !== userId) {
        const memberDoc = await doc.ref.collection('members').doc(userId).get();
        if (memberDoc.exists) {
          userRole = memberDoc.data()?.role || 'viewer';
        }
      }

      timelines.push({
        ...data,
        id: doc.id,
        role: userRole,
      });
    }

    // Sort by updatedAt descending
    timelines.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.status(200).json({
      success: true,
      data: timelines,
      message: 'Timelines retrieved successfully',
    });
  } catch (err: any) {
    console.error('[Get Timelines Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve timelines' },
    });
  }
});

// POST /api/timelines - create a new timeline
router.post('/', async (req: Request, res: Response) => {
  const user = req.user!;
  const { name, description, startDate, endDate, visibility = 'shared', slots = [] } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Timeline name is required' },
    });
    return;
  }

  if (!startDate || !endDate) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Start date and end date are required' },
    });
    return;
  }

  if (endDate < startDate) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'End date must be equal to or later than start date' },
    });
    return;
  }

  try {
    const timelineRef = db.collection('timelines').doc();
    const now = new Date().toISOString();

    const timelineData: TimelineDoc = {
      id: timelineRef.id,
      name: name.trim(),
      description: (description || '').trim(),
      startDate,
      endDate,
      isActive: true,
      ownerId: user.uid,
      memberIds: [user.uid],
      visibility: visibility === 'public' ? 'public' : visibility === 'private' ? 'private' : 'shared',
      createdAt: now,
      updatedAt: now,
    };

    // Run in a batch to create timeline, owner membership, and initial events atomically
    const batch = db.batch();
    batch.set(timelineRef, timelineData);

    // 1. Add Owner as first member
    const ownerMemberRef = timelineRef.collection('members').doc(user.uid);
    const ownerMember: TimelineMember = {
      userId: user.uid,
      email: user.email || '',
      displayName: user.name || user.email?.split('@')[0] || 'Owner',
      photoURL: user.picture || '',
      role: 'owner',
      status: 'active',
      joinedAt: now,
    };
    batch.set(ownerMemberRef, ownerMember);

    // 2. Add initial slots / events if provided
    if (Array.isArray(slots) && slots.length > 0) {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const eventRef = timelineRef.collection('events').doc();
        batch.set(eventRef, {
          id: eventRef.id,
          timelineId: timelineRef.id,
          title: slot.activity_name || slot.title || 'Event',
          description: slot.description || '',
          startDate: slot.startDate || startDate,
          endDate: slot.endDate || endDate,
          startTime: slot.start_time || slot.startTime || '05:00 AM',
          endTime: slot.end_time || slot.endTime || '06:00 AM',
          type: slot.category || slot.type || 'study',
          color: slot.color || '#818CF8',
          status: 'scheduled',
          createdBy: user.uid,
          sortOrder: typeof slot.sort_order === 'number' ? slot.sort_order : i,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await batch.commit();

    res.status(201).json({
      success: true,
      data: { ...timelineData, role: 'owner' },
      message: 'Timeline created successfully',
    });
  } catch (err: any) {
    console.error('[Create Timeline Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to create timeline' },
    });
  }
});

// GET /api/timelines/:timelineId - get single timeline details
router.get('/:timelineId', requireTimelineRole('viewer'), async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      ...req.timeline,
      role: req.timelineRole,
    },
    message: 'Timeline retrieved successfully',
  });
});

// PATCH /api/timelines/:timelineId - update timeline
router.patch('/:timelineId', requireTimelineRole('editor'), async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;
  const { name, description, startDate, endDate, isActive, visibility } = req.body;
  const userRole = req.timelineRole!;

  const updates: Partial<TimelineDoc> = {
    updatedAt: new Date().toISOString(),
  };

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Name cannot be empty' },
      });
      return;
    }
    updates.name = name.trim();
  }

  if (description !== undefined) updates.description = String(description).trim();
  if (startDate !== undefined) updates.startDate = startDate;
  if (endDate !== undefined) updates.endDate = endDate;
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  // Only owner can change visibility
  if (visibility !== undefined) {
    if (userRole !== 'owner') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only timeline owner can change visibility' },
      });
      return;
    }
    updates.visibility = visibility;
  }

  try {
    const timelineRef = db.collection('timelines').doc(timelineId);
    await timelineRef.update(updates);
    const updated = await timelineRef.get();

    res.status(200).json({
      success: true,
      data: { id: updated.id, ...updated.data(), role: userRole },
      message: 'Timeline updated successfully',
    });
  } catch (err: any) {
    console.error('[Update Timeline Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to update timeline' },
    });
  }
});

// DELETE /api/timelines/:timelineId - delete timeline (Owner only)
router.delete('/:timelineId', requireTimelineRole('owner'), async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;

  try {
    const timelineRef = db.collection('timelines').doc(timelineId);

    // Delete subcollection docs
    const eventsSnap = await timelineRef.collection('events').get();
    const membersSnap = await timelineRef.collection('members').get();

    const batch = db.batch();
    eventsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    membersSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(timelineRef);

    await batch.commit();

    res.status(200).json({
      success: true,
      data: { id: timelineId },
      message: 'Timeline deleted successfully',
    });
  } catch (err: any) {
    console.error('[Delete Timeline Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to delete timeline' },
    });
  }
});

export default router;
