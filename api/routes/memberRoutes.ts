import { Router, Request, Response } from 'express';
import { db, auth, firebaseAdmin } from '../config/firebaseAdmin';
import { requireAuth } from '../middleware/auth';
import { requireTimelineRole } from '../middleware/membership';
import { TimelineMember, MemberRole } from '../types/api';

const router = Router({ mergeParams: true });

router.use(requireAuth);

// GET /api/timelines/:timelineId/members
router.get('/', requireTimelineRole('viewer'), async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;

  try {
    const membersRef = db.collection('timelines').doc(timelineId).collection('members');
    const snap = await membersRef.get();

    const members: TimelineMember[] = snap.docs.map((doc) => doc.data() as TimelineMember);

    res.status(200).json({
      success: true,
      data: members,
      message: 'Members retrieved successfully',
    });
  } catch (err: any) {
    console.error('[Get Members Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve timeline members' },
    });
  }
});

// POST /api/timelines/:timelineId/invite - invite member by email
router.post('/invite', requireTimelineRole('owner'), async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;
  const { email, role = 'editor' } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'A valid email address is required for invitation' },
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const validRole: MemberRole = role === 'viewer' ? 'viewer' : 'editor';

  try {
    let targetUid: string | null = null;
    let targetDisplayName = normalizedEmail.split('@')[0];
    let targetPhotoURL = '';

    // 1. Try finding user in Firebase Auth
    try {
      const userRecord = await auth.getUserByEmail(normalizedEmail);
      targetUid = userRecord.uid;
      targetDisplayName = userRecord.displayName || targetDisplayName;
      targetPhotoURL = userRecord.photoURL || '';
    } catch {
      // User might be registered only in Firestore or not yet signed up
      const usersSnap = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
      if (!usersSnap.empty) {
        const uDoc = usersSnap.docs[0];
        targetUid = uDoc.id;
        const uData = uDoc.data();
        targetDisplayName = uData.displayName || targetDisplayName;
        targetPhotoURL = uData.photoURL || '';
      }
    }

    // If still not registered in Firebase, create an invite ID so they can claim it upon sign up
    if (!targetUid) {
      targetUid = `invited_${Buffer.from(normalizedEmail).toString('hex').substring(0, 20)}`;
    }

    const timelineRef = db.collection('timelines').doc(timelineId);
    const memberRef = timelineRef.collection('members').doc(targetUid);
    const now = new Date().toISOString();

    const memberData: TimelineMember = {
      userId: targetUid,
      email: normalizedEmail,
      displayName: targetDisplayName,
      photoURL: targetPhotoURL,
      role: validRole,
      status: targetUid.startsWith('invited_') ? 'invited' : 'active',
      joinedAt: now,
    };

    const batch = db.batch();
    batch.set(memberRef, memberData, { merge: true });
    batch.update(timelineRef, {
      memberIds: firebaseAdmin.firestore.FieldValue.arrayUnion(targetUid),
      updatedAt: now,
    });
    await batch.commit();

    res.status(200).json({
      success: true,
      data: memberData,
      message: `User ${normalizedEmail} invited as ${validRole}`,
    });
  } catch (err: any) {
    console.error('[Invite Member Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to process member invitation' },
    });
  }
});

// PATCH /api/timelines/:timelineId/members/:targetUserId - update role (Owner only)
router.patch('/:targetUserId', requireTimelineRole('owner'), async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;
  const targetUserId = req.params.targetUserId as string;
  const { role } = req.body;

  if (!['editor', 'viewer'].includes(role)) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Role must be either editor or viewer' },
    });
    return;
  }

  if (targetUserId === req.timeline.ownerId) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Cannot modify the owner role' },
    });
    return;
  }

  try {
    const memberRef = db.collection('timelines').doc(timelineId).collection('members').doc(targetUserId);
    const snap = await memberRef.get();

    if (!snap.exists) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found in this timeline' },
      });
      return;
    }

    await memberRef.update({ role });
    const updated = await memberRef.get();

    res.status(200).json({
      success: true,
      data: updated.data(),
      message: 'Member role updated successfully',
    });
  } catch (err: any) {
    console.error('[Update Member Role Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to update member role' },
    });
  }
});

// DELETE /api/timelines/:timelineId/members/:targetUserId - remove member
router.delete('/:targetUserId', async (req: Request, res: Response) => {
  const timelineId = req.params.timelineId as string;
  const targetUserId = req.params.targetUserId as string;
  const currentUserId = req.user!.uid;

  try {
    const timelineRef = db.collection('timelines').doc(timelineId);
    const timelineSnap = await timelineRef.get();

    if (!timelineSnap.exists) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Timeline not found' },
      });
      return;
    }

    const timelineData = timelineSnap.data()!;

    // Cannot remove owner
    if (targetUserId === timelineData.ownerId) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Cannot remove the owner of the timeline' },
      });
      return;
    }

    // Only owner OR the member themselves can perform removal
    const isOwner = timelineData.ownerId === currentUserId;
    const isSelf = targetUserId === currentUserId;

    if (!isOwner && !isSelf) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to remove this member' },
      });
      return;
    }

    const memberRef = timelineRef.collection('members').doc(targetUserId);
    const batch = db.batch();
    batch.delete(memberRef);
    batch.update(timelineRef, {
      memberIds: firebaseAdmin.firestore.FieldValue.arrayRemove(targetUserId),
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();

    res.status(200).json({
      success: true,
      data: { userId: targetUserId, timelineId },
      message: isSelf ? 'You have left the timeline' : 'Member removed from timeline',
    });
  } catch (err: any) {
    console.error('[Remove Member Error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to remove member' },
    });
  }
});

export default router;
