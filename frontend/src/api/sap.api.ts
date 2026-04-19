import apiClient from './client';
import { SAPObject, SourceAnalysis } from '../types';

export type ActivationMode = 'auto' | 'manual';

export interface WriteBackStructuredResult {
  requestId: string;
  requestSuccess: boolean;
  writeSuccess: boolean;
  activationSuccess: boolean | null;
  activationMode: ActivationMode;
  stage: 'precheck' | 'lock' | 'write' | 'activate' | 'unlock' | 'done';
  errorCode?: string;
  error?: string;
  messages: string[];
  timings: {
    precheck_ms?: number;
    write_ms?: number;
    activate_ms?: number;
    unlock_ms?: number;
    total_ms: number;
  };
  data?: {
    reachable: boolean;
    sourceUrl: string;
    transportRequired?: boolean;
    syntaxOk?: boolean | null;
  };
}

export async function searchSAPObjects(
  query: string,
  type?: string,
  max = 20
): Promise<SAPObject[]> {
  const params: Record<string, unknown> = { q: query, max };
  if (type) params.type = type;
  const res = await apiClient.get('/sap/search', { params });
  return res.data.data?.results ?? [];
}

export async function getSAPObjectSource(objectUrl: string): Promise<{
  source: string;
  objectUrl: string;
  sourceUrl: string;
}> {
  const res = await apiClient.get('/sap/source', { params: { objectUrl } });
  return res.data.data;
}

export async function analyzeObjectSource(objectUrl: string): Promise<SourceAnalysis> {
  const res = await apiClient.get('/sap/analyze', { params: { objectUrl } });
  return res.data.data;
}

export async function writeBackToSAP(payload: {
  objectUrl: string;
  objectName: string;
  source: string;
  transportNumber?: string;
  activationMode?: ActivationMode;
}): Promise<WriteBackStructuredResult> {
  const res = await apiClient.post('/sap/write-back', payload);
  return res.data;
}

export async function precheckWriteBackToSAP(payload: {
  objectUrl: string;
  objectName: string;
  source?: string;
}): Promise<WriteBackStructuredResult> {
  const res = await apiClient.post('/sap/write-back/precheck', payload);
  return res.data;
}

export async function activateAfterWrite(payload: {
  objectUrl: string;
  objectName: string;
}): Promise<WriteBackStructuredResult> {
  const res = await apiClient.post('/sap/write-back/activate', payload);
  return res.data;
}

export async function getHealthStatus(): Promise<{
  status: string;
  sap: {
    connected: boolean;
    url: string;
    host: string;
    user: string;
    client: string;
    language: string;
    lastCheck?: string | null;
    message?: string;
  };
  claude: { available: boolean };
}> {
  const res = await apiClient.get('/health');
  return res.data;
}
