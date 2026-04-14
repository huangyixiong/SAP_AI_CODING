import { Router } from 'express';
import { optimizePrompt } from '../controllers/prompt.controller';

const router = Router();

// POST /api/prompt/optimize - 优化提示词
router.post('/optimize', optimizePrompt);

export default router;
