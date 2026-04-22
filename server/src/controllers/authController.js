import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { User } from '../models/User.js';
import { signToken } from '../utils/tokens.js';
import { logActivity } from '../utils/activity.js';

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  pointsBalance: user.pointsBalance,
  status: user.status,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

export const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 60 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: 'player',
  });

  await logActivity({
    actorId: user._id,
    targetUserId: user._id,
    action: 'player.registered',
    ipAddress: req.ip,
  });

  res.status(201).json({
    token: signToken(user),
    user: sanitizeUser(user),
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  user.lastLoginAt = new Date();
  await user.save();

  await logActivity({
    actorId: user._id,
    targetUserId: user._id,
    action: user.role === 'admin' ? 'admin.logged_in' : 'player.logged_in',
    ipAddress: req.ip,
  });

  res.json({
    token: signToken(user),
    user: sanitizeUser(user),
  });
};

export const me = async (req, res) => {
  res.json({
    user: sanitizeUser(req.user),
  });
};
