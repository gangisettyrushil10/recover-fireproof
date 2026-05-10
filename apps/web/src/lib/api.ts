/**
 * Thin typed API client for the Fireproof REST API.
 *
 * - Reads `NEXT_PUBLIC_API_URL` for the base URL (default `http://localhost:4000`).
 * - Attaches the dev-login bearer token from a cookie set by `/v1/auth/dev-login`.
 * - Returns parsed JSON; surfaces 422 / 423 / 4xx as `ApiError` instances so
 *   the UI can render `BLOCKING_REQUIREMENTS_UNMET` and `LEGAL_HOLD_ACTIVE`
 *   inline.
 */

import type {
  AuditEvent,
  Contradiction,
  DocumentVersion,
  EvidenceItem,
  Exception,
  ExceptionType,
  GetDocumentResponse,
  GetPacketResponse,
  LegalHold,
  ListAuditEventsResponse,
  ListExceptionsResponse,
  ListPacketsResponse,
  Packet,
  PacketType,
  RuleEvaluation,
} from '@fireproof/domain';

export interface ApiErrorBody {
  code?: string;
  error?: string;
  message?: string;
  missing?: string[];
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody, message?: string) {
    super(message ?? body.message ?? body.error ?? `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /** True if this is a `BLOCKING_REQUIREMENTS_UNMET` / 422 error. */
  get isBlocking(): boolean {
    return this.status === 422 || this.body.code === 'BLOCKING_REQUIREMENTS_UNMET';
  }

  /** True if this is a `LEGAL_HOLD_ACTIVE` / 423 error. */
  get isLegalHold(): boolean {
    return this.status === 423 || this.body.code === 'LEGAL_HOLD_ACTIVE';
  }
}

const DEV_LOGIN_COOKIE = 'fireproof_token';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const re = new RegExp('(?:^|; )' + name + '=([^;]*)');
  const m = document.cookie.match(re);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

export function getAuthToken(): string | null {
  return readCookie(DEV_LOGIN_COOKIE);
}

export function setAuthToken(value: string, maxAgeSeconds = 60 * 60 * 8): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${DEV_LOGIN_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearAuthToken(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${DEV_LOGIN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

const API_BASE: string =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** Auto-JSON-encoded request body. */
  json?: unknown;
  /** Raw body (FormData, ArrayBuffer, …). Takes precedence over `json`. */
  body?: BodyInit | null;
  /** Optional explicit token; otherwise read from the dev-login cookie. */
  token?: string | null;
  /** Server-side requests should pass this so we don't try to read cookies. */
  serverToken?: string | null;
}

async function request<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(opts.headers);
  if (opts.json !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const token = opts.token ?? opts.serverToken ?? getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const init: RequestInit = {
    ...opts,
    headers,
    body: opts.body ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
    cache: opts.cache ?? 'no-store',
  };

  const res = await fetch(url, init);
  const ct = res.headers.get('content-type') ?? '';
  const parsed: unknown = ct.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => '');

  if (!res.ok) {
    const body =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as ApiErrorBody)
        : { message: typeof parsed === 'string' ? parsed : undefined };
    throw new ApiError(res.status, body);
  }

  return parsed as T;
}

// ─── Helper: query string ───────────────────────────────────────────────────

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface DevLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organization_id: string;
    organization_name: string;
  };
}

// ─── Property dashboard ─────────────────────────────────────────────────────

export interface PropertyDashboard {
  property: {
    id: string;
    name: string;
    address?: string;
    jurisdiction?: { id: string; name: string; confidence: string } | null;
  };
  open_exceptions: Array<
    Exception & { latest_evaluation?: RuleEvaluation | null }
  >;
  packet_readiness: Array<{
    type: PacketType;
    label: string;
    ready_count: number;
    missing_count: number;
    last_emitted_at?: string | null;
  }>;
  contradiction_count: number;
  recent_audit_events: AuditEvent[];
  risk_summary: {
    open_count: number;
    blocking_count: number;
    overdue_count: number;
    severity_breakdown: Record<string, number>;
  };
}

// ─── API surface ────────────────────────────────────────────────────────────

export const apiClient = {
  request,

  auth: {
    devLogin: (email: string) =>
      request<DevLoginResponse>('/v1/auth/dev-login', { method: 'POST', json: { email } }),
    me: () =>
      request<{ user: DevLoginResponse['user'] }>('/v1/auth/me'),
  },

  properties: {
    dashboard: (propertyId: string, opts?: { token?: string | null }) =>
      request<PropertyDashboard>(`/v1/properties/${propertyId}/dashboard`, {
        token: opts?.token ?? undefined,
      }),
    contradictions: (propertyId: string) =>
      request<{ items: Contradiction[] }>(`/v1/properties/${propertyId}/contradictions`),
  },

  exceptions: {
    list: (params: { property_id?: string; type?: ExceptionType; open_only?: boolean }) =>
      request<ListExceptionsResponse>(`/v1/exceptions${qs(params)}`),
    get: (id: string) =>
      request<{
        exception: Exception;
        evidence: EvidenceItem[];
        latest_evaluation: RuleEvaluation | null;
      }>(`/v1/exceptions/${id}`),
    transition: (id: string, body: { to_state: string; reason?: string | null }) =>
      request<Exception>(`/v1/exceptions/${id}/transition`, {
        method: 'POST',
        json: body,
      }),
    upsertEvidence: (
      id: string,
      body: Record<string, unknown>,
    ) =>
      request<EvidenceItem>(`/v1/exceptions/${id}/evidence`, {
        method: 'POST',
        json: body,
      }),
  },

  ruleEvaluations: {
    run: (body: { exception_id: string; persist?: boolean }) =>
      request<RuleEvaluation>('/v1/rule-evaluations/run', {
        method: 'POST',
        json: body,
      }),
  },

  packets: {
    list: (params: { property_id?: string }) =>
      request<ListPacketsResponse>(`/v1/packets${qs(params)}`),
    create: (body: {
      organization_id: string;
      exception_id: string;
      type: PacketType;
      title: string;
    }) =>
      request<Packet>('/v1/packets', { method: 'POST', json: body }),
    get: (id: string) => request<GetPacketResponse>(`/v1/packets/${id}`),
  },

  legalHolds: {
    create: (body: {
      organization_id: string;
      name: string;
      reason: string;
      subjects?: Array<{ kind: string; id: string }>;
    }) => request<LegalHold>('/v1/legal-holds', { method: 'POST', json: body }),
    activate: (id: string) =>
      request<LegalHold>(`/v1/legal-holds/${id}/activate`, { method: 'POST', json: {} }),
    release: (id: string, reason: string) =>
      request<LegalHold>(`/v1/legal-holds/${id}/release`, {
        method: 'POST',
        json: { reason },
      }),
  },

  documents: {
    get: (id: string) => request<GetDocumentResponse>(`/v1/documents/${id}`),
    listByProperty: (propertyId: string) =>
      request<{ items: Array<GetDocumentResponse['document'] & { hold_active?: boolean }> }>(
        `/v1/properties/${propertyId}/documents`,
      ),
    createVersion: (
      documentId: string,
      body: {
        sha256: string;
        byte_size: number;
        mime_type: string;
        storage_key: string;
        is_original?: boolean;
      },
    ) =>
      request<DocumentVersion>(`/v1/documents/${documentId}/versions`, {
        method: 'POST',
        json: body,
      }),
  },

  auditEvents: {
    list: (params: { entity_id?: string; subject_kind?: string }) =>
      request<ListAuditEventsResponse>(`/v1/audit-events${qs(params)}`),
  },

  rulePacks: {
    list: () =>
      request<{
        items: Array<{
          id: string;
          jurisdiction_id: string;
          jurisdiction_name?: string;
          version: string | number;
          effective_from: string;
          effective_to: string | null;
          confidence: string;
          status: string;
        }>;
      }>('/v1/rule-packs'),
  },
};

export type ApiClient = typeof apiClient;
