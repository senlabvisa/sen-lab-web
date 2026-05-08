import type {
  AssignmentDto,
  AttemptDto,
  AuthTokensDto,
  ClassDto,
  ClassStudentDto,
  CompleteAttemptDto,
  CreateAssignmentDto,
  CreateClassDto,
  CreateSchoolDto,
  CreateUserDto,
  EvaluateAttemptDto,
  JoinClassResultDto,
  LoginDto,
  RubricEvaluation,
  SchoolDto,
  SimulationDto,
  StartAttemptDto,
  UserDto,
} from '@senlabvisa/shared-types';

interface BulkImportRow {
  identifier: string;
  fullName: string;
  role: 'student' | 'teacher' | 'admin' | 'sysadmin';
  password?: string;
  schoolId?: string;
  gradeLevel?: string;
  phoneNumber?: string;
}

export interface BulkImportResultDto {
  created: Array<{ id: string; identifier: string; generatedPassword: string }>;
  failed: Array<{ identifier: string; reason: string }>;
}

const BASE = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3010';

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body === 'object' && 'message' in body) {
        const m = (body as { message: unknown }).message;
        message = Array.isArray(m) ? m.join(', ') : String(m);
      }
    } catch {
      /* body wasn't JSON, keep status message */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  login: (dto: LoginDto) =>
    request<AuthTokensDto>('/auth/login', { method: 'POST', body: JSON.stringify(dto) }),

  me: (token: string) =>
    request<UserDto>('/users/me', { method: 'GET', headers: auth(token) }),

  schools: {
    list: (token: string) =>
      request<SchoolDto[]>('/schools', { method: 'GET', headers: auth(token) }),

    create: (token: string, input: CreateSchoolDto) =>
      request<SchoolDto>('/schools', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(input),
      }),

    update: (token: string, id: string, input: Partial<CreateSchoolDto>) =>
      request<SchoolDto>(`/schools/${id}`, {
        method: 'PATCH',
        headers: auth(token),
        body: JSON.stringify(input),
      }),

    remove: (token: string, id: string) =>
      request<void>(`/schools/${id}`, { method: 'DELETE', headers: auth(token) }),
  },

  users: {
    list: (token: string, filters: { schoolId?: string; role?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.schoolId) params.set('schoolId', filters.schoolId);
      if (filters.role) params.set('role', filters.role);
      const qs = params.toString();
      return request<UserDto[]>(`/users${qs ? `?${qs}` : ''}`, {
        method: 'GET',
        headers: auth(token),
      });
    },

    create: (token: string, input: CreateUserDto) =>
      request<UserDto>('/users', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(input),
      }),

    resetPassword: (token: string, id: string, newPassword?: string) =>
      request<{ newPassword: string }>(`/users/${id}/password`, {
        method: 'PATCH',
        headers: auth(token),
        body: JSON.stringify(newPassword ? { newPassword } : {}),
      }),

    bulkImport: (token: string, rows: BulkImportRow[]) =>
      request<BulkImportResultDto>('/users/bulk', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({ rows }),
      }),
  },

  classes: {
    list: (token: string, filters: { teacherId?: string } = {}) => {
      const qs = filters.teacherId ? `?teacherId=${encodeURIComponent(filters.teacherId)}` : '';
      return request<ClassDto[]>(`/classes${qs}`, { method: 'GET', headers: auth(token) });
    },

    get: (token: string, id: string) =>
      request<ClassDto>(`/classes/${id}`, { method: 'GET', headers: auth(token) }),

    create: (token: string, input: CreateClassDto) =>
      request<ClassDto>('/classes', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(input),
      }),

    update: (token: string, id: string, input: Partial<CreateClassDto>) =>
      request<ClassDto>(`/classes/${id}`, {
        method: 'PATCH',
        headers: auth(token),
        body: JSON.stringify(input),
      }),

    listStudents: (token: string, id: string) =>
      request<ClassStudentDto[]>(`/classes/${id}/students`, {
        method: 'GET',
        headers: auth(token),
      }),

    enrollStudent: (token: string, id: string, studentId: string) =>
      request<ClassStudentDto>(`/classes/${id}/students`, {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({ studentId }),
      }),

    unenrollStudent: (token: string, id: string, studentId: string) =>
      request<void>(`/classes/${id}/students/${studentId}`, {
        method: 'DELETE',
        headers: auth(token),
      }),

    regenerateCode: (token: string, id: string) =>
      request<ClassDto>(`/classes/${id}/regenerate-code`, {
        method: 'POST',
        headers: auth(token),
      }),

    updateWhitelist: (token: string, id: string, whitelist: string[]) =>
      request<ClassDto>(`/classes/${id}/whitelist`, {
        method: 'PATCH',
        headers: auth(token),
        body: JSON.stringify({ whitelist }),
      }),

    join: (token: string, code: string) =>
      request<JoinClassResultDto>('/classes/join', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({ code }),
      }),

    listAssignments: (token: string, classId: string) =>
      request<AssignmentDto[]>(`/classes/${classId}/assignments`, {
        method: 'GET',
        headers: auth(token),
      }),

    myAssignments: (token: string) =>
      request<AssignmentDto[]>('/classes/assignments/mine', {
        method: 'GET',
        headers: auth(token),
      }),

    createAssignment: (token: string, classId: string, input: CreateAssignmentDto) =>
      request<AssignmentDto>(`/classes/${classId}/assignments`, {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(input),
      }),

    deleteAssignment: (token: string, assignmentId: string) =>
      request<void>(`/classes/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: auth(token),
      }),
  },

  simulations: {
    list: (token: string, filters: { subject?: string; targetGrade?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.subject) params.set('subject', filters.subject);
      if (filters.targetGrade) params.set('targetGrade', filters.targetGrade);
      const qs = params.toString();
      return request<SimulationDto[]>(`/simulations${qs ? `?${qs}` : ''}`, {
        method: 'GET',
        headers: auth(token),
      });
    },

    getBySlug: (token: string, slug: string) =>
      request<SimulationDto>(`/simulations/slug/${encodeURIComponent(slug)}`, {
        method: 'GET',
        headers: auth(token),
      }),
  },

  attempts: {
    start: (token: string, input: StartAttemptDto) =>
      request<AttemptDto>('/attempts/start', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(input),
      }),

    update: (token: string, id: string, dataJson: Record<string, unknown>) =>
      request<AttemptDto>(`/attempts/${id}`, {
        method: 'PATCH',
        headers: auth(token),
        body: JSON.stringify({ dataJson }),
      }),

    complete: (token: string, id: string, input: CompleteAttemptDto) =>
      request<AttemptDto>(`/attempts/${id}/complete`, {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(input),
      }),

    mine: (token: string) =>
      request<AttemptDto[]>('/attempts/mine', { method: 'GET', headers: auth(token) }),

    list: (
      token: string,
      filters: { studentId?: string; simulationId?: string; status?: string } = {},
    ) => {
      const params = new URLSearchParams();
      if (filters.studentId) params.set('studentId', filters.studentId);
      if (filters.simulationId) params.set('simulationId', filters.simulationId);
      if (filters.status) params.set('status', filters.status);
      const qs = params.toString();
      return request<AttemptDto[]>(`/attempts${qs ? `?${qs}` : ''}`, {
        method: 'GET',
        headers: auth(token),
      });
    },

    findById: (token: string, id: string) =>
      request<AttemptDto>(`/attempts/${id}`, { method: 'GET', headers: auth(token) }),

    evaluate: (token: string, id: string, input: EvaluateAttemptDto) =>
      request<AttemptDto>(`/attempts/${id}/evaluation`, {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(input),
      }),

    publish: (token: string, id: string) =>
      request<AttemptDto>(`/attempts/${id}/publish`, {
        method: 'POST',
        headers: auth(token),
      }),
  },

  analytics: {
    me: (token: string) =>
      request<UserStatsDto>('/analytics/me', { method: 'GET', headers: auth(token) }),

    user: (token: string, id: string) =>
      request<UserStatsDto>(`/analytics/users/${id}`, { method: 'GET', headers: auth(token) }),

    classOverview: (token: string, classId: string) =>
      request<ClassOverviewDto>(`/analytics/classes/${classId}/overview`, {
        method: 'GET',
        headers: auth(token),
      }),
  },
};

export type Badge =
  | 'premier-pas'
  | 'trio'
  | 'excellence'
  | 'polyvalent'
  | 'perseverant'
  | 'maitre-maths'
  | 'maitre-pc'
  | 'maitre-svt'
  | 'expert-college'
  | 'expert-lycee'
  | 'legende'
  | 'parfait'
  | 'bachelier'
  | 'bfem-pret'
  | 'decouvreur';

export type UserStatsDto = {
  userId: string;
  xp: number;
  startedCount: number;
  completedCount: number;
  averageScore: number | null;
  badges: Badge[];
};

export type ClassOverviewDto = {
  rosterSize: number;
  simulations: Array<{
    simulationId: string;
    simulationTitle: string;
    subject: string;
    startedCount: number;
    completedCount: number;
    averageScore: number | null;
    completionRate: number;
  }>;
};
