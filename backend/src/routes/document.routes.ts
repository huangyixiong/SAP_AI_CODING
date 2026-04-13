import { Router } from 'express';
import {
  generateTS,
  generateFS,
  generateCode,
  generateFSFromMeeting,
  generatePseudocode,
} from '../controllers/document.controller';
import { llmRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply LLM rate limiting to all document generation endpoints
router.post('/ts/stream', llmRateLimiter, generateTS);
router.post('/fs/stream', llmRateLimiter, generateFS);
router.post('/code/stream', llmRateLimiter, generateCode);
router.post('/fs-from-meeting/stream', llmRateLimiter, generateFSFromMeeting);
router.post('/pseudocode/stream', llmRateLimiter, generatePseudocode);

export default router;
