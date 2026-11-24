import Constants from 'expo-constants';

const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? Constants.expoConfig?.extra?.apiBase;
export const API_BASE = typeof configuredBase === 'string' ? configuredBase.replace(/\/$/, '') : '';

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
  return apiRequest<void>('/auth/logout', {
    method: 'POST', body: JSON.stringify({ refreshToken }),
  }, accessToken);
}

export function completeOnboarding(entries: {
  clientId: string;
  kind: 'planned';
  type: 'expense' | 'income' | 'saving';
  amountPaise: number;
  category: string;
  month: string;
  note?: string;
}[], accessToken: string) {
  return apiRequest<{ setupCompleted: true; savedEntries: number }>('/onboarding/complete', {
    method: 'POST', body: JSON.stringify({ entries }),
  }, accessToken);
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

let accessToken: string | null = null;

export function getAccessToken() { return accessToken; }
