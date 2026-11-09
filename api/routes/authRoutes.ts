import { Router, Request, Response } from 'express';
import { db } from '../config/firebaseAdmin';
import { requireAuth } from '../middleware/auth';
import { UserProfile } from '../types/api';

const router = Router();

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const userRef = db.collection('users').doc(user.uid);

  try {
    const doc = await userRef.get();
    const now = new Date().toISOString();

    if (!doc.exists) {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.name || user.email?.split('@')[0] || 'User',
        photoURL: user.picture || '',
        createdAt: now,
        updatedAt: now,
      };

      await userRef.set(newProfile);
      res.status(200).json({
        success: true,
        data: newProfile,
        message: 'User profile created',
      });
      return;
    }

    const data = doc.data() as UserProfile;
    res.status(200).json({
      success: true,
      data,
      message: 'Success',
    });
  } catch (err: any) {
    console.error('[Auth /me error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve user profile' },
    });
  }
});

// PUT /api/auth/me - update profile
router.put('/me', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const { displayName, photoURL } = req.body;
  const userRef = db.collection('users').doc(user.uid);

  try {
    const updates: Partial<UserProfile> = {
      updatedAt: new Date().toISOString(),
    };
    if (typeof displayName === 'string') updates.displayName = displayName.trim();
    if (typeof photoURL === 'string') updates.photoURL = photoURL.trim();

    await userRef.set(updates, { merge: true });
    const updatedDoc = await userRef.get();

    res.status(200).json({
      success: true,
      data: updatedDoc.data(),
      message: 'Profile updated successfully',
    });
  } catch (err: any) {
    console.error('[Auth update error]:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to update user profile' },
    });
  }
});

export default router;

