import { Platform } from 'react-native';
import { clearRefreshToken, getRefreshToken, setRefreshToken } from './authTokens';

const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const localFallback = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const API_BASE = (configuredBase || localFallback).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiErrorBody = { error?: { code?: string; message?: string } };

export async function apiRequest<T>(path: string, options: RequestInit = {}, accessToken?: string): Promise<T> {
  if (!API_BASE) throw new Error('API base URL is not configured.');
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/v1${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach Ledger. Check your connection and try again.');
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({})) as ApiErrorBody & T;
  if (!response.ok) {
    throw new ApiError(response.status, body.error?.code ?? 'REQUEST_FAILED', body.error?.message ?? 'The request could not be completed.');
  }
  return body as T;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    try {
      const result = await apiRequest<AuthResult>('/auth/refresh', {
        method: 'POST', body: JSON.stringify({ refreshToken }),
      });
      await setRefreshToken(result.tokens.refreshToken);
      setAccessToken(result.tokens.accessToken);
      return result.tokens.accessToken;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearRefreshToken().catch(() => {});
        setAccessToken(null);
      }
      throw error;
    }
  })();
  try { return await refreshInFlight; } finally { refreshInFlight = null; }
}

/** Makes an authenticated request, rotating the refresh token once after an expired access JWT. */
export async function authenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = getAccessToken() ?? await refreshAccessToken();
  if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue.');
  try {
    return await apiRequest<T>(path, options, token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || path === '/auth/refresh') throw error;
    if (options.signal?.aborted) throw error;
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) throw error;
    token = refreshedToken;
    return apiRequest<T>(path, options, token);
  }
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface ApiUser {
  id: string;
  email: string;
  name?: string;
  setupCompleted?: boolean;
}

export interface AuthResult { user: ApiUser; tokens: TokenPair }

export function requestEmailCode(email: string) {
  return apiRequest<{ ok: true; message: string }>('/auth/email/send', {
    method: 'POST', body: JSON.stringify({ email }),
  });
}

export function verifyEmailCode(email: string, code: string) {
  return apiRequest<AuthResult>('/auth/email/verify', {
    method: 'POST', body: JSON.stringify({ email, code }),
  });
}

export function refreshSession(refreshToken: string) {
  return apiRequest<AuthResult>('/auth/refresh', {
    method: 'POST', body: JSON.stringify({ refreshToken }),
  });
}

export function logoutSession(refreshToken: string, accessToken: string) {
  const sendLogout = (token: string, bearer: string) => apiRequest<void>('/auth/logout', {
    method: 'POST', body: JSON.stringify({ refreshToken: token }),
  }, bearer);
  return sendLogout(refreshToken, accessToken).catch(async (error: unknown) => {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const bearer = await refreshAccessToken();
    const rotatedRefreshToken = await getRefreshToken();
    if (!bearer || !rotatedRefreshToken) throw error;
    return sendLogout(rotatedRefreshToken, bearer);
  });
}

export function completeOnboarding(entries: {
  clientId: string;
  kind: 'planned';
  type: 'expense' | 'income' | 'saving';
  amountPaise: number;
  category: string;
  month: string;
  note?: string;
}[]) {
  return authenticatedRequest<{ setupCompleted: true; savedEntries: number }>('/onboarding/complete', {
    method: 'POST', body: JSON.stringify({ entries }),
  });
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

let accessToken: string | null = null;

export function getAccessToken() { return accessToken; }
