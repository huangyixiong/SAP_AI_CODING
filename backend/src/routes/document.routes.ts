import { Router } from 'express';
import {
  generateTS,
  generateFS,
  generateCode,
  generateFSFromMeeting,
} from '../controllers/document.controller';

const router = Router();

router.post('/ts/stream', generateTS);
router.post('/fs/stream', generateFS);
router.post('/code/stream', generateCode);
router.post('/fs-from-meeting/stream', generateFSFromMeeting);

export default router;
