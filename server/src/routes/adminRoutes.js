import { Router } from 'express';
import {
  createUser,
  createUserValidation,
  getActivities,
  getOverview,
  getSlotSettings,
  listUsers,
  listUsersValidation,
  loadPoints,
  pointActionValidation,
  redeemPoints,
  slotSettingsValidation,
  statusValidation,
  updateSlotSettings,
  updateUserStatus,
} from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/overview', getOverview);
router.get('/users', listUsersValidation, validate, listUsers);
router.post('/users', createUserValidation, validate, createUser);
router.patch('/users/:id/status', statusValidation, validate, updateUserStatus);
router.post('/users/:id/load', pointActionValidation, validate, loadPoints);
router.post('/users/:id/redeem', pointActionValidation, validate, redeemPoints);
router.get('/activities', getActivities);
router.get('/slot-settings', getSlotSettings);
router.patch('/slot-settings', slotSettingsValidation, validate, updateSlotSettings);

export default router;
