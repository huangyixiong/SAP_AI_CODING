export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SAPSearchResult {
  name: string;
  type: string;
  description: string;
  objectUrl: string;
  packageName?: string;
}

export interface SAPSourceResult {
  source: string;
  objectUrl: string;
  sourceUrl: string;
}

export interface WriteBackRequest {
  objectUrl: string;
  objectName: string;
  source: string;
  transportNumber?: string;
  activationMode?: ActivationMode;
  requestId?: string;
}

export type ActivationMode = 'auto' | 'manual';

export type WriteBackStage =
  | 'precheck'
  | 'lock'
  | 'write'
  | 'activate'
  | 'unlock'
  | 'done';

export type WriteBackErrorCode =
  | 'LOCK_CONFLICT'
  | 'OBJECT_URL_INVALID'
  | 'OBJECT_NAME_MISMATCH'
  | 'TRANSPORT_REQUIRED'
  | 'SYNTAX_CHECK_FAILED'
  | 'WRITE_SOURCE_FAILED'
  | 'ACTIVATION_FAILED'
  | 'UNLOCK_FAILED'
  | 'MCP_TIMEOUT'
  | 'SAP_SESSION_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

export interface StageTiming {
  precheck_ms?: number;
  write_ms?: number;
  activate_ms?: number;
  unlock_ms?: number;
  total_ms: number;
}

export interface WriteBackResult {
  requestId: string;
  requestSuccess: boolean;
  writeSuccess: boolean;
  activationSuccess: boolean | null;
  activationMode: ActivationMode;
  stage: WriteBackStage;
  errorCode?: WriteBackErrorCode;
  error?: string;
  messages: string[];
  timings: StageTiming;
}

export interface GenerateDocumentRequest {
  programName: string;
  objectType?: string;
}

export interface GenerateCodeRequest {
  fsContent: string;
  targetProgramName: string;
}

export interface GenerateFSFromMeetingRequest {
  meetingContent: string;
  projectContext?: string;
}

// SSE event types
export type SSEEventType = 'start' | 'source_fetched' | 'chunk' | 'done' | 'error' | 'warning';

export interface SSEEvent {
  type: SSEEventType;
  [key: string]: unknown;
}

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
