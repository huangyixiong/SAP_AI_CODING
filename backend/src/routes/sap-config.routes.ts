import { Router } from 'express';
import {
  getConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  activateConfig,
  testConnection,
} from '../controllers/sap-config.controller';

const router = Router();

router.get('/', getConfigs);
router.post('/', createConfig);
router.put('/:id', updateConfig);
router.delete('/:id', deleteConfig);
router.post('/:id/activate', activateConfig);
router.post('/:id/test', testConnection);

export default router;
