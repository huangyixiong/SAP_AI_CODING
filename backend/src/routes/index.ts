import { Router } from 'express';
import healthRoutes from './health.routes';
import sapRoutes from './sap.routes';
import documentRoutes from './document.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/sap', sapRoutes);
router.use('/documents', documentRoutes);

export default router;
