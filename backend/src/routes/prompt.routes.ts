import { Router } from 'express';
import { optimizePrompt, getDefaultPrompts } from '../controllers/prompt.controller';

const router = Router();

// GET /api/prompt/defaults - 获取默认提示词
router.get('/defaults', getDefaultPrompts);

// POST /api/prompt/optimize - 优化提示词
router.post('/optimize', optimizePrompt);

export default router;