import { Router } from 'express';
import healthRoutes from './health.routes';
import sapRoutes from './sap.routes';
import documentRoutes from './document.routes';
import sapConfigRoutes from './sap-config.routes';
import authRoutes from './auth.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/sap', sapRoutes);
router.use('/documents', documentRoutes);
router.use('/sap-configs', sapConfigRoutes);

export default router;
