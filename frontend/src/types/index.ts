export interface RelatedObject {
  name: string;
  type: string;
  category: string;   // 'include' | 'function' | 'class' | 'table'
  description?: string;
  objectUrl?: string;
  autoInclude: boolean;
}

export interface SourceAnalysis {
  source: string;
  lineCount: number;
  relatedObjects: RelatedObject[];
}

export interface SAPObject {
  name: string;
  type: string;
  description: string;
  objectUrl: string;
  packageName?: string;
}

export interface SSEChunkEvent {
  type: 'chunk';
  content: string;
}

export interface SSEStatusEvent {
  type: 'start' | 'object_found' | 'source_fetched' | 'generating' | 'done' | 'error' | 'warning';
  message?: string;
  programName?: string;
  objectName?: string;
  sourceLength?: number;
  lineCount?: number;
  totalChars?: number;
  [key: string]: unknown;
}

export type SSEEvent = SSEChunkEvent | SSEStatusEvent;

export type GenerationStatus = 'idle' | 'loading' | 'generating' | 'done' | 'error';
