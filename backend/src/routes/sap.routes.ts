import { Router } from 'express';
import { searchObjects, getObjectSource, analyzeObject, writeBack } from '../controllers/sap.controller';
import { sapQueryRateLimiter, writeBackRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply SAP query rate limiting
router.get('/search', sapQueryRateLimiter, searchObjects);
router.get('/source', sapQueryRateLimiter, getObjectSource);
router.get('/analyze', sapQueryRateLimiter, analyzeObject);

// Apply stricter rate limiting for write operations
router.post('/write-back', writeBackRateLimiter, writeBack);

export default router;
