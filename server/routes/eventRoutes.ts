import { Router, Request, Response } from 'express';
import { db } from '../config/firebaseAdmin';
import { requireAuth } from '../middleware/auth';
import { requireTimelineRole } from '../middleware/membership';
import { TimelineEvent } from '../types/api';

const router = Router({ mergeParams: true });

// All routes require auth
router.use(requireAuth);

// GET /api/timelines/:timelineId/events - list events
router.get('/', requireTimelineRole('viewer'), async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;

  try {
    const eventsRef = db.collection('timelines').doc(timelineId).collection('events');
    const snapshot = await eventsRef.orderBy('sortOrder', 'asc').get();

    const events: TimelineEvent[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      timelineId,
      ...(doc.data() as any),
    }));

    res.status(200).json({
      success: true,
      data: events,
      message: 'Events retrieved successfully',
    });
  } catch (err: any) {
    console.error('[Get Events Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve timeline events' },
    });
  }
});

// POST /api/timelines/:timelineId/events - create event
router.post('/', requireTimelineRole('editor'), async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;
  const user = req.user!;
  const {
    title,
    description = '',
    startDate,
    endDate,
    startTime = '05:00 AM',
    endTime = '06:00 AM',
    type = 'study',
    color = '#818CF8',
    status = 'scheduled',
    assignedTo,
    sortOrder,
  } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Event title is required' },
    });
    return;
  }

  try {
    const timelineRef = db.collection('timelines').doc(timelineId);
    const eventRef = timelineRef.collection('events').doc();
    const now = new Date().toISOString();

    const eventData: TimelineEvent = {
      id: eventRef.id,
      timelineId,
      title: title.trim(),
      description: String(description).trim(),
      startDate: startDate || req.timeline.startDate,
      endDate: endDate || req.timeline.endDate,
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      type: String(type).trim(),
      color: String(color).trim(),
      status: ['scheduled', 'in-progress', 'completed'].includes(status) ? status : 'scheduled',
      createdBy: user.uid,
      assignedTo: assignedTo || null,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : Date.now(),
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(eventRef, eventData);
    batch.update(timelineRef, { updatedAt: now });
    await batch.commit();

    res.status(201).json({
      success: true,
      data: eventData,
      message: 'Event created successfully',
    });
  } catch (err: any) {
    console.error('[Create Event Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to create event' },
    });
  }
});

// GET /api/timelines/:timelineId/events/:eventId
router.get('/:eventId', requireTimelineRole('viewer'), async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;
  const eventId = req.params.eventId as string;

  try {
    const eventRef = db.collection('timelines').doc(timelineId).collection('events').doc(eventId);
    const snap = await eventRef.get();

    if (!snap.exists) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Event ${eventId} not found` },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { id: snap.id, timelineId, ...snap.data() },
      message: 'Event retrieved successfully',
    });
  } catch (err: any) {
    console.error('[Get Single Event Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve event' },
    });
  }
});

// PATCH /api/timelines/:timelineId/events/:eventId
router.patch('/:eventId', requireTimelineRole('editor'), async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;
  const eventId = req.params.eventId as string;
  const {
    title,
    description,
    startDate,
    endDate,
    startTime,
    endTime,
    type,
    color,
    status,
    assignedTo,
    sortOrder,
  } = req.body;

  try {
    const timelineRef = db.collection('timelines').doc(timelineId);
    const eventRef = timelineRef.collection('events').doc(eventId);
    const snap = await eventRef.get();

    if (!snap.exists) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Event ${eventId} not found` },
      });
      return;
    }

    const now = new Date().toISOString();
    const updates: Partial<TimelineEvent> = {
      updatedAt: now,
    };

    if (title !== undefined) updates.title = String(title).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;
    if (type !== undefined) updates.type = type;
    if (color !== undefined) updates.color = color;
    if (status !== undefined) updates.status = status;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);

    const batch = db.batch();
    batch.update(eventRef, updates);
    batch.update(timelineRef, { updatedAt: now });
    await batch.commit();

    const updatedSnap = await eventRef.get();

    res.status(200).json({
      success: true,
      data: { id: eventId, timelineId, ...updatedSnap.data() },
      message: 'Event updated successfully',
    });
  } catch (err: any) {
    console.error('[Update Event Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to update event' },
    });
  }
});

// DELETE /api/timelines/:timelineId/events/:eventId
router.delete('/:eventId', requireTimelineRole('editor'), async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;
  const eventId = req.params.eventId as string;

  try {
    const timelineRef = db.collection('timelines').doc(timelineId);
    const eventRef = timelineRef.collection('events').doc(eventId);
    const snap = await eventRef.get();

    if (!snap.exists) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Event ${eventId} not found` },
      });
      return;
    }

    const batch = db.batch();
    batch.delete(eventRef);
    batch.update(timelineRef, { updatedAt: new Date().toISOString() });
    await batch.commit();

    res.status(200).json({
      success: true,
      data: { id: eventId, timelineId },
      message: 'Event deleted successfully',
    });
  } catch (err: any) {
    console.error('[Delete Event Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to delete event' },
    });
  }
});

export default router;
