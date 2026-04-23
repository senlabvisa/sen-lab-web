import type { AuthTokensDto, LoginDto, UserDto } from '@senlabvisa/shared-types';

const BASE = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (dto: LoginDto) =>
    request<AuthTokensDto>('/auth/login', { method: 'POST', body: JSON.stringify(dto) }),
  me: (accessToken: string) =>
    request<UserDto>('/users/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
