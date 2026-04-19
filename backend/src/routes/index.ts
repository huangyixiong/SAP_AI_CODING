import { Router } from 'express';
import healthRoutes from './health.routes';
import sapRoutes from './sap.routes';
import documentRoutes from './document.routes';
import promptRoutes from './prompt.routes';
import mailRoutes from './mail.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/sap', sapRoutes);
router.use('/documents', documentRoutes);
router.use('/prompt', promptRoutes);
router.use('/mail', mailRoutes);

export default router;
