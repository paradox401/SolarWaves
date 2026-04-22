import { Router } from 'express';
import {
  login,
  loginValidation,
  me,
  register,
  registerValidation,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', requireAuth, me);

export default router;
