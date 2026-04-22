import { Router } from 'express';
import {
  getPlayerDashboard,
  spinSlots,
} from '../controllers/gameController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', getPlayerDashboard);
router.post('/spin', spinSlots);

export default router;
