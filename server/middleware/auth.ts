import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebaseAdmin';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Preflight OPTIONS requests must never require authentication
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header. Expected Bearer <token>.',
      },
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    console.error('[Auth Middleware] Token verification failed:', error.message);
    const isExpired = error.code === 'auth/id-token-expired';

    res.status(401).json({
      success: false,
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: isExpired
          ? 'Firebase ID token has expired. Please refresh your session.'
          : 'Invalid or revoked authentication token.',
      },
    });
  }
}
