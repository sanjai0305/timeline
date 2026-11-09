import cors, { CorsOptions } from 'cors';

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://time-line-5bbcd.web.app',
  'https://time-line-5bbcd.firebaseapp.com',
];

export function configureCors() {
  const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];

  const allowedOrigins = [...defaultAllowedOrigins, ...envOrigins];

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile Capacitor native app, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin matches allowed origins or vercel preview domains
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('http://localhost');

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS Blocked] Origin ${origin} not allowed`);
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 hours
  };

  return cors(corsOptions);
}

