import { Router } from 'express';
import { searchObjects, getObjectSource, analyzeObject, writeBack } from '../controllers/sap.controller';

const router = Router();

router.get('/search', searchObjects);
router.get('/source', getObjectSource);
router.get('/analyze', analyzeObject);
router.post('/write-back', writeBack);

export default router;
