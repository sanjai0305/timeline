import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface ApiFetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(message: string, code = 'API_ERROR', status = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiClient<T = any>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { requiresAuth = true, headers = {}, ...customConfig } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Automatically attach Firebase ID Token if user is authenticated
  if (requiresAuth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      requestHeaders['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.warn('[API Client] Could not retrieve ID token:', err);
    }
  }

  // Ensure clean path
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${normalizedEndpoint}`;

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers: requestHeaders,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const result = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorCode = result?.error?.code || `HTTP_${response.status}`;
      const errorMessage = result?.error?.message || response.statusText || 'Request failed';
      throw new ApiError(errorMessage, errorCode, response.status, result?.error?.details);
    }

    return (result?.data !== undefined ? result.data : result) as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle network errors or server unreachable
    throw new ApiError(
      error.message || 'Network error: could not connect to server',
      'NETWORK_ERROR',
      0
    );
  }
}

