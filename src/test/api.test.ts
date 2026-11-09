import { describe, it, expect } from 'vitest';
import { createApp } from '../../api/app';

describe('Vercel API Routes & Security', () => {
  const app = createApp();

  it('responds with 200 on /api/health', async () => {
    // Basic Express mock call
    const mockReq: any = {
      method: 'GET',
      url: '/api/health',
      headers: {},
    };

    let statusCode = 0;
    let jsonBody: any = null;

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonBody = data;
        return this;
      },
      setHeader() {},
      getHeader() {},
    };

    await new Promise<void>((resolve) => {
      (app as any).handle(mockReq, mockRes, () => resolve());
      // Check if finished
      if (statusCode !== 0) resolve();
    });

    expect(statusCode).toBe(200);
    expect(jsonBody.success).toBe(true);
    expect(jsonBody.message).toContain('healthy');
  });

  it('rejects unauthenticated requests to /api/timelines with 401', async () => {
    const mockReq: any = {
      method: 'GET',
      url: '/api/timelines',
      headers: {},
    };

    let statusCode = 0;
    let jsonBody: any = null;

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonBody = data;
        return this;
      },
      setHeader() {},
      getHeader() {},
    };

    await new Promise<void>((resolve) => {
      (app as any).handle(mockReq, mockRes, () => resolve());
      if (statusCode !== 0) resolve();
    });

    expect(statusCode).toBe(401);
    expect(jsonBody.success).toBe(false);
    expect(jsonBody.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 for non-existent API routes', async () => {
    const mockReq: any = {
      method: 'GET',
      url: '/api/unknown-route',
      originalUrl: '/api/unknown-route',
      headers: {},
    };

    let statusCode = 0;
    let jsonBody: any = null;

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonBody = data;
        return this;
      },
      setHeader() {},
      getHeader() {},
    };

    await new Promise<void>((resolve) => {
      (app as any).handle(mockReq, mockRes, () => resolve());
      if (statusCode !== 0) resolve();
    });

    expect(statusCode).toBe(404);
    expect(jsonBody.success).toBe(false);
    expect(jsonBody.error.code).toBe('NOT_FOUND');
  });
});
