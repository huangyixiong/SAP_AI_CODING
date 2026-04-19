import { Router } from 'express';
import { sendSpecDocuments } from '../controllers/mail.controller';

const router = Router();

router.post('/send-spec', sendSpecDocuments);

export default router;
