import { Request, Response, NextFunction } from 'express';

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3001',
  'https://timelines-nu.vercel.app',
  'https://time-line-5bbcd.web.app',
  'https://time-line-5bbcd.firebaseapp.com',
];

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Server-to-server, curl, Capacitor native app

  const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim().toLowerCase())
    : [];

  const normalized = origin.trim().toLowerCase();
  const allowedList = [...defaultAllowedOrigins, ...envOrigins].map((o) => o.toLowerCase());

  return (
    allowedList.includes(normalized) ||
    normalized.endsWith('.vercel.app') ||
    normalized.startsWith('capacitor://') ||
    normalized.startsWith('http://localhost:') ||
    normalized.startsWith('http://127.0.0.1:') ||
    normalized === 'http://localhost'
  );
}

/**
 * Universal CORS middleware with immediate preflight OPTIONS handling.
 * Returns HTTP 204 No Content for preflight OPTIONS requests without requiring authentication.
 */
export function configureCors() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin as string | undefined;

    // Always set Vary: Origin so intermediate caches distinguish cross-origin requests
    res.setHeader('Vary', 'Origin');

    if (origin && isOriginAllowed(origin)) {
      // Use exact requesting origin (never wildcard * when authorization headers/credentials are present)
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
      // Non-browser or server-to-server requests
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PATCH, PUT, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Accept, X-Requested-With'
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours preflight cache

    // Handle OPTIONS preflight immediately with 204 No Content
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}

export default configureCors;
