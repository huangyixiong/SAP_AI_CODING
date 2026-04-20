import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/requirePermission';
import { asyncHandler } from '../lib/asyncHandler';
import * as RoleService from '../services/RoleService';

const router = Router();
router.use(requireRole('admin'));

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await RoleService.listRoles());
}));

router.get('/permissions', asyncHandler(async (_req, res) => {
  res.json(await RoleService.listPermissions());
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
  }).parse(req.body);
  res.status(201).json(await RoleService.createRole(data));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const data = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
  }).parse(req.body);
  res.json(await RoleService.updateRole(Number(req.params.id), data));
}));

router.put('/:id/permissions', asyncHandler(async (req, res) => {
  const { permissionIds } = z.object({
    permissionIds: z.array(z.number()),
  }).parse(req.body);
  await RoleService.assignPermissions(Number(req.params.id), permissionIds);
  res.json({ success: true });
}));

export default router;
