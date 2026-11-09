import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRequests = new Map<string, RateLimitRecord>();

/**
 * Lightweight sliding window rate limiter
 * Allows maxRequests per windowMs
 */
export function rateLimiter(maxRequests = 120, windowMs = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    let ip = 'unknown-ip';
    try {
      ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket?.remoteAddress ||
        (req as any).ip ||
        'unknown-ip';
    } catch {
      ip = 'unknown-ip';
    }

    const now = Date.now();
    const record = ipRequests.get(ip);

    if (!record || now > record.resetTime) {
      ipRequests.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    record.count++;

    if (record.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests. Please slow down and try again later.',
        },
      });
      return;
    }

    next();
  };
}
