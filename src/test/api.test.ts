import { describe, it, expect } from 'vitest';
import { createApp } from '../../server/app';

describe('Vercel API Routes & Security', () => {
  const app = createApp();

  it('responds with 200 on /api/health', async () => {
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
      end() {},
    };

    await new Promise<void>((resolve) => {
      (app as any).handle(mockReq, mockRes, () => resolve());
      if (statusCode !== 0) resolve();
    });

    expect(statusCode).toBe(200);
    expect(jsonBody.success).toBe(true);
    expect(jsonBody.message).toContain('healthy');
  });

  it('handles CORS OPTIONS preflight on /api/timelines/:id/members with 204 No Content', async () => {
    const headersSent: Record<string, string> = {};

    const mockReq: any = {
      method: 'OPTIONS',
      url: '/api/timelines/test-id-123/members',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization,content-type',
      },
    };

    let statusCode = 0;
    let ended = false;

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader(name: string, val: string) {
        headersSent[name.toLowerCase()] = val;
      },
      getHeader(name: string) {
        return headersSent[name.toLowerCase()];
      },
      end() {
        ended = true;
      },
      json() {},
    };

    await new Promise<void>((resolve) => {
      (app as any).handle(mockReq, mockRes, () => resolve());
      if (statusCode !== 0 || ended) resolve();
    });

    expect(statusCode).toBe(204);
    expect(ended).toBe(true);
    expect(headersSent['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(headersSent['access-control-allow-methods']).toContain('GET');
    expect(headersSent['access-control-allow-methods']).toContain('OPTIONS');
    expect(headersSent['access-control-allow-headers'].toLowerCase()).toContain('authorization');
    expect(headersSent['access-control-allow-headers'].toLowerCase()).toContain('content-type');
    expect(headersSent['vary']).toBe('Origin');
  });

  it('rejects unauthenticated requests to /api/timelines with 401', async () => {
    const mockReq: any = {
      method: 'GET',
      url: '/api/timelines',
      headers: {
        origin: 'http://localhost:3000',
      },
    };

    let statusCode = 0;
    let jsonBody: any = null;
    const headersSent: Record<string, string> = {};

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonBody = data;
        return this;
      },
      setHeader(name: string, val: string) {
        headersSent[name.toLowerCase()] = val;
      },
      getHeader(name: string) {
        return headersSent[name.toLowerCase()];
      },
      end() {},
    };

    await new Promise<void>((resolve) => {
      (app as any).handle(mockReq, mockRes, () => resolve());
      if (statusCode !== 0) resolve();
    });

    expect(statusCode).toBe(401);
    expect(jsonBody.success).toBe(false);
    expect(jsonBody.error.code).toBe('UNAUTHORIZED');
    expect(headersSent['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('rejects unauthenticated requests to /api/timelines/:id/members with 401 while preserving CORS', async () => {
    const mockReq: any = {
      method: 'GET',
      url: '/api/timelines/test-id-123/members',
      headers: {
        origin: 'http://localhost:3000',
      },
    };

    let statusCode = 0;
    let jsonBody: any = null;
    const headersSent: Record<string, string> = {};

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonBody = data;
        return this;
      },
      setHeader(name: string, val: string) {
        headersSent[name.toLowerCase()] = val;
      },
      getHeader(name: string) {
        return headersSent[name.toLowerCase()];
      },
      end() {},
    };

    await new Promise<void>((resolve) => {
      (app as any).handle(mockReq, mockRes, () => resolve());
      if (statusCode !== 0) resolve();
    });

    expect(statusCode).toBe(401);
    expect(jsonBody.success).toBe(false);
    expect(jsonBody.error.code).toBe('UNAUTHORIZED');
    expect(headersSent['access-control-allow-origin']).toBe('http://localhost:3000');
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
      end() {},
    };

    await new Promise<void>((resolve) => {
      (app as any).handle(mockReq, mockRes, () => resolve());
      if (statusCode !== 0) resolve();
    });

    expect(statusCode).toBe(404);
    expect(jsonBody.success).toBe(false);
    expect(jsonBody.error.code).toBe('NOT_FOUND');
  });

  it('rejects unauthenticated invitation to /api/timelines/test-id/invite with 401', async () => {
    const mockReq: any = {
      method: 'POST',
      url: '/api/timelines/test-id/invite',
      body: { email: 'colleague@example.com', role: 'editor' },
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
      end() {},
    };

    await new Promise<void>((resolve) => {
      (app as any).handle(mockReq, mockRes, () => resolve());
      if (statusCode !== 0) resolve();
    });

    expect(statusCode).toBe(401);
    expect(jsonBody.success).toBe(false);
    expect(jsonBody.error.code).toBe('UNAUTHORIZED');
  });
});
