import { Router } from 'express';
import {
  generateTS,
  generateFS,
  generateFSFromRequirement,
  generateReferencePrompt,
  generatePseudocode,
} from '../controllers/document.controller';
import { llmRateLimiter } from '../middleware/rateLimiter';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();

// Apply LLM rate limiting to all document generation endpoints
router.post('/ts/stream', llmRateLimiter, requirePermission('ts_reverse'), generateTS);
router.post('/fs/stream', llmRateLimiter, requirePermission('fs_reverse'), generateFS);
router.post('/requirement-fs/stream', llmRateLimiter, requirePermission('spec_gen'), generateFSFromRequirement);
router.post('/reference-prompt/stream', llmRateLimiter, generateReferencePrompt);
router.post('/pseudocode/stream', llmRateLimiter, generatePseudocode);

export default router;
