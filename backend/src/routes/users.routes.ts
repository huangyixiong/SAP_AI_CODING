import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/requirePermission';
import { asyncHandler } from '../lib/asyncHandler';
import * as UserService from '../services/UserService';

const router = Router();
router.use(requireRole('admin'));

const idParam = z.coerce.number().int().positive();

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit } = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }).parse(req.query);
  res.json(await UserService.listUsers(page, limit));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = z.object({
    username: z.string().min(2), fullName: z.string().min(1),
    email: z.string().email(), password: z.string().min(8),
  }).parse(req.body);
  res.status(201).json(await UserService.createUser(data));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const data = z.object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);
  res.json(await UserService.updateUser(idParam.parse(req.params.id), data));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await UserService.deactivateUser(idParam.parse(req.params.id));
  res.json({ success: true });
}));

router.put('/:id/roles', asyncHandler(async (req, res) => {
  const { roleIds } = z.object({ roleIds: z.array(z.number()) }).parse(req.body);
  await UserService.assignRoles(idParam.parse(req.params.id), roleIds);
  res.json({ success: true });
}));

export default router;
