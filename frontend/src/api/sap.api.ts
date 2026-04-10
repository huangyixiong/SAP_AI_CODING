import apiClient from './client';
import { SAPObject, SourceAnalysis } from '../types';

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
}): Promise<{ success: boolean; error?: string }> {
  const res = await apiClient.post('/sap/write-back', payload);
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
