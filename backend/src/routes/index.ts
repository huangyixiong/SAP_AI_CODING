import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import sapRoutes from './sap.routes';
import documentRoutes from './document.routes';
import promptRoutes from './prompt.routes';
import mailRoutes from './mail.routes';
import usersRoutes from './users.routes';
import rolesRoutes from './roles.routes';
import mailConfigRoutes from './mail-config.routes';

const router = Router();

// Public
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Protected — authMiddleware applied globally to everything below
router.use(authMiddleware);

router.use('/sap', sapRoutes);
router.use('/documents', documentRoutes);
router.use('/prompt', promptRoutes);
router.use('/mail', mailRoutes);
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/mail-config', mailConfigRoutes);

export default router;
