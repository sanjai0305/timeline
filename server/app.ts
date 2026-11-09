import express, { Express, Request, Response } from 'express';
import { configureCors } from './middleware/cors';
import { rateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import timelineRoutes from './routes/timelineRoutes';
import eventRoutes from './routes/eventRoutes';
import memberRoutes from './routes/memberRoutes';

export function createApp(): Express {
  const app = express();

  // 1. CORS Configuration MUST run first on all incoming requests
  app.use(configureCors());

  // 2. Explicit OPTIONS handler immediately returns 204 No Content
  app.options('*', (_req: Request, res: Response) => {
    res.status(204).end();
  });

  // 3. Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 4. Rate limiter (OPTIONS requests are excluded inside rateLimiter)
  app.use(rateLimiter(150, 60 * 1000)); // 150 requests per minute

  // 5. Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Routine & Timeline Planner API is healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // 6. API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/timelines', timelineRoutes);
  app.use('/api/timelines/:timelineId/events', eventRoutes);
  app.use('/api/timelines/:timelineId/members', memberRoutes);
  app.use('/api/timelines/:timelineId/invite', memberRoutes);

  // 7. 404 Handler for unmatched routes under /api
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `API route ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // 8. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
