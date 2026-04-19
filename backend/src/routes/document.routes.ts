import { Router } from 'express';
import {
  generateTS,
  generateFS,
  generateFSFromRequirement,
  generateReferencePrompt,
  generatePseudocode,
} from '../controllers/document.controller';
import { llmRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply LLM rate limiting to all document generation endpoints
router.post('/ts/stream', llmRateLimiter, generateTS);
router.post('/fs/stream', llmRateLimiter, generateFS);
router.post('/requirement-fs/stream', llmRateLimiter, generateFSFromRequirement);
router.post('/reference-prompt/stream', llmRateLimiter, generateReferencePrompt);
router.post('/pseudocode/stream', llmRateLimiter, generatePseudocode);

export default router;
