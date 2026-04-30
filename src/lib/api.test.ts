import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

type FetchCall = { url: string; init: RequestInit };
const calls: FetchCall[] = [];

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => body,
  } as Response;
}

let nextResponse: Response | null = null;

beforeEach(() => {
  calls.length = 0;
  nextResponse = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (nextResponse) {
        const r = nextResponse;
        nextResponse = null;
        return r;
      }
      return mockResponse({ id: 's1', name: 'Lycée X', region: 'Dakar', createdAt: 'now', updatedAt: 'now' });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api.schools', () => {
  it('list() calls GET /schools with bearer token', async () => {
    nextResponse = mockResponse([]);
    await api.schools.list('tok');
    expect(calls[0].url).toContain('/schools');
    expect(calls[0].init.method ?? 'GET').toBe('GET');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('create() calls POST /schools with JSON body', async () => {
    await api.schools.create('tok', { name: 'Lycée Y', region: 'Thiès' });
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.body).toBe(JSON.stringify({ name: 'Lycée Y', region: 'Thiès' }));
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('update() calls PATCH /schools/:id', async () => {
    await api.schools.update('tok', 'id1', { name: 'Nouveau' });
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toContain('/schools/id1');
    expect(calls[0].init.body).toBe(JSON.stringify({ name: 'Nouveau' }));
  });

  it('remove() calls DELETE /schools/:id', async () => {
    nextResponse = mockResponse('', true, 204);
    await api.schools.remove('tok', 'id1');
    expect(calls[0].init.method).toBe('DELETE');
    expect(calls[0].url).toContain('/schools/id1');
  });

  it('throws on non-OK response with server message', async () => {
    nextResponse = mockResponse({ message: 'School already exists', statusCode: 409 }, false, 409);
    await expect(api.schools.create('tok', { name: 'X', region: 'Y' })).rejects.toThrow(
      /School already exists|409/,
    );
  });
});

describe('api.users', () => {
  it('list() calls GET /users and passes filters via query string', async () => {
    nextResponse = mockResponse([]);
    await api.users.list('tok', { role: 'teacher', schoolId: 'school-1' });
    expect(calls[0].init.method ?? 'GET').toBe('GET');
    expect(calls[0].url).toContain('/users?');
    expect(calls[0].url).toContain('role=teacher');
    expect(calls[0].url).toContain('schoolId=school-1');
  });

  it('list() omits query string when no filter given', async () => {
    nextResponse = mockResponse([]);
    await api.users.list('tok');
    expect(calls[0].url).toMatch(/\/users$/);
  });

  it('create() POSTs with CreateUserDto body', async () => {
    await api.users.create('tok', {
      identifier: 'teacher/moussa',
      fullName: 'Moussa',
      password: 'Secret123',
      role: 'teacher',
    });
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body as string).role).toBe('teacher');
  });

  it('resetPassword() calls PATCH /users/:id/password with new password', async () => {
    nextResponse = mockResponse({ newPassword: 'abc' });
    await api.users.resetPassword('tok', 'id1', 'NewPass123');
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toContain('/users/id1/password');
    expect(JSON.parse(calls[0].init.body as string).newPassword).toBe('NewPass123');
  });

  it('resetPassword() without password sends empty body (server generates)', async () => {
    nextResponse = mockResponse({ newPassword: 'generated' });
    const res = await api.users.resetPassword('tok', 'id1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({});
    expect(res.newPassword).toBe('generated');
  });
});

describe('api.classes', () => {
  it('list() with teacherId filter builds query string', async () => {
    nextResponse = mockResponse([]);
    await api.classes.list('tok', { teacherId: 't-1' });
    expect(calls[0].url).toContain('/classes?teacherId=t-1');
  });

  it('list() without filter calls /classes', async () => {
    nextResponse = mockResponse([]);
    await api.classes.list('tok');
    expect(calls[0].url).toMatch(/\/classes$/);
  });

  it('create() POSTs with CreateClassDto body', async () => {
    await api.classes.create('tok', {
      teacherId: 't-1',
      name: '3ème A',
      academicYear: '2026-2027',
    });
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body as string).name).toBe('3ème A');
  });

  it('enrollStudent() POSTs to /classes/:id/students with studentId', async () => {
    await api.classes.enrollStudent('tok', 'c-1', 's-1');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toContain('/classes/c-1/students');
    expect(JSON.parse(calls[0].init.body as string).studentId).toBe('s-1');
  });

  it('unenrollStudent() DELETEs /classes/:id/students/:sid', async () => {
    nextResponse = mockResponse('', true, 204);
    await api.classes.unenrollStudent('tok', 'c-1', 's-1');
    expect(calls[0].init.method).toBe('DELETE');
    expect(calls[0].url).toContain('/classes/c-1/students/s-1');
  });

  it('listStudents() calls GET /classes/:id/students', async () => {
    nextResponse = mockResponse([]);
    await api.classes.listStudents('tok', 'c-1');
    expect(calls[0].url).toContain('/classes/c-1/students');
  });
});

describe('api.simulations', () => {
  it('list() builds query with subject filter', async () => {
    nextResponse = mockResponse([]);
    await api.simulations.list('tok', { subject: 'Maths' });
    expect(calls[0].url).toContain('/simulations?');
    expect(calls[0].url).toContain('subject=Maths');
  });

  it('list() without filters calls /simulations', async () => {
    nextResponse = mockResponse([]);
    await api.simulations.list('tok');
    expect(calls[0].url).toMatch(/\/simulations$/);
  });

  it('getBySlug() calls GET /simulations/slug/:slug with URL-encoding', async () => {
    await api.simulations.getBySlug('tok', 'loi-dohm-3eme');
    expect(calls[0].url).toContain('/simulations/slug/loi-dohm-3eme');
  });
});

describe('api.attempts', () => {
  it('start() POSTs /attempts/start with simulationId', async () => {
    await api.attempts.start('tok', { simulationId: 'sim-1' });
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toContain('/attempts/start');
    expect(JSON.parse(calls[0].init.body as string).simulationId).toBe('sim-1');
  });

  it('update() PATCHes /attempts/:id wrapping dataJson', async () => {
    await api.attempts.update('tok', 'a-1', { step: 1 });
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toContain('/attempts/a-1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ dataJson: { step: 1 } });
  });

  it('complete() POSTs /attempts/:id/complete with score+dataJson', async () => {
    await api.attempts.complete('tok', 'a-1', { score: 80, dataJson: { final: true } });
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toContain('/attempts/a-1/complete');
    expect(JSON.parse(calls[0].init.body as string).score).toBe(80);
  });

  it('mine() calls GET /attempts/mine', async () => {
    nextResponse = mockResponse([]);
    await api.attempts.mine('tok');
    expect(calls[0].url).toMatch(/\/attempts\/mine$/);
  });

  it('list() builds query with filters', async () => {
    nextResponse = mockResponse([]);
    await api.attempts.list('tok', { simulationId: 'sim-1', status: 'completed' });
    expect(calls[0].url).toContain('/attempts?');
    expect(calls[0].url).toContain('simulationId=sim-1');
    expect(calls[0].url).toContain('status=completed');
  });
});

describe('api.analytics', () => {
  it('me() calls GET /analytics/me', async () => {
    nextResponse = mockResponse({ userId: 'u1', xp: 100, startedCount: 2, completedCount: 1, averageScore: 85, badges: [] });
    const res = await api.analytics.me('tok');
    expect(calls[0].url).toMatch(/\/analytics\/me$/);
    expect(res.xp).toBe(100);
  });

  it('user() calls GET /analytics/users/:id', async () => {
    nextResponse = mockResponse({ userId: 'u1', xp: 50, startedCount: 1, completedCount: 1, averageScore: 60, badges: ['premier-pas'] });
    await api.analytics.user('tok', 'u1');
    expect(calls[0].url).toContain('/analytics/users/u1');
  });

  it('classOverview() calls GET /analytics/classes/:id/overview', async () => {
    nextResponse = mockResponse({ rosterSize: 3, simulations: [] });
    const res = await api.analytics.classOverview('tok', 'c1');
    expect(calls[0].url).toContain('/analytics/classes/c1/overview');
    expect(res.rosterSize).toBe(3);
  });
});
