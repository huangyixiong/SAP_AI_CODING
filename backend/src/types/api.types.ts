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
}

export interface WriteBackResult {
  success: boolean;
  activationResult?: {
    success: boolean;
    messages: string[];
  };
  error?: string;
}

export interface GenerateDocumentRequest {
  programName: string;
  objectType?: string;
}

export interface GenerateCodeRequest {
  fsContent: string;
  targetProgramName?: string;
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
