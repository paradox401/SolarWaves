import bcrypt from 'bcryptjs';
import { body, param, query } from 'express-validator';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { PointTransaction } from '../models/PointTransaction.js';
import { getGameSettings } from '../utils/gameSettings.js';
import { applyPointChange } from '../utils/points.js';
import { logActivity } from '../utils/activity.js';

const adminUserView = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  pointsBalance: user.pointsBalance,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
});

export const createUserValidation = [
  body('name').trim().isLength({ min: 2, max: 60 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
];

export const pointActionValidation = [
  param('id').isMongoId(),
  body('amount').isInt({ min: 1 }),
  body('note').optional().trim().isLength({ max: 140 }),
];

export const statusValidation = [
  param('id').isMongoId(),
  body('status').isIn(['active', 'blocked']),
];

export const listUsersValidation = [
  query('search').optional().trim().isLength({ max: 80 }),
];

export const slotSettingsValidation = [
  body('winChancePercent').isFloat({ min: 1, max: 95 }),
  body('spinCost').isInt({ min: 1, max: 10000 }),
  body('twoMatchMultiplier').isFloat({ min: 1, max: 20 }),
  body('threeMatchMultiplier').isFloat({ min: 1, max: 50 }),
  body('jackpotMultiplier').isFloat({ min: 1, max: 200 }),
];

export const createUser = async (req, res) => {
  const { name, email, password } = req.body;
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({ message: 'Email is already in use' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: 'player',
  });

  await logActivity({
    actorId: req.user._id,
    targetUserId: user._id,
    action: 'admin.created_user',
    meta: { email: user.email },
    ipAddress: req.ip,
  });

  res.status(201).json({ user: adminUserView(user) });
};

export const listUsers = async (req, res) => {
  const { search = '' } = req.query;
  const filter = {
    role: 'player',
  };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ users: users.map(adminUserView) });
};

export const updateUserStatus = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'player' });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.status = req.body.status;
  await user.save();

  await logActivity({
    actorId: req.user._id,
    targetUserId: user._id,
    action: 'admin.updated_user_status',
    meta: { status: user.status },
    ipAddress: req.ip,
  });

  res.json({ user: adminUserView(user) });
};

const runPointMutation = async ({ req, res, type, signedAmount, action }) => {
  const user = await User.findOne({ _id: req.params.id, role: 'player' });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { balance, transaction } = await applyPointChange({
    user,
    actorId: req.user._id,
    type,
    amount: signedAmount,
    note: req.body.note || '',
  });

  await logActivity({
    actorId: req.user._id,
    targetUserId: user._id,
    action,
    meta: {
      amount: req.body.amount,
      note: req.body.note || '',
      balanceAfter: balance,
    },
    ipAddress: req.ip,
  });

  res.json({
    user: adminUserView(user),
    transaction,
  });
};

export const loadPoints = async (req, res) =>
  runPointMutation({
    req,
    res,
    type: 'load',
    signedAmount: Number(req.body.amount),
    action: 'admin.loaded_points',
  });

export const redeemPoints = async (req, res) =>
  runPointMutation({
    req,
    res,
    type: 'redeem',
    signedAmount: -Number(req.body.amount),
    action: 'admin.redeemed_points',
  });

export const getOverview = async (req, res) => {
  const [players, activePlayers, blockedPlayers, transactionCount, balances, recentActivity, settings] =
    await Promise.all([
      User.countDocuments({ role: 'player' }),
      User.countDocuments({ role: 'player', status: 'active' }),
      User.countDocuments({ role: 'player', status: 'blocked' }),
      PointTransaction.countDocuments(),
      User.aggregate([
        { $match: { role: 'player' } },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$pointsBalance' },
          },
        },
      ]),
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('actor', 'name email role')
        .populate('targetUser', 'name email'),
      getGameSettings(),
    ]);

  res.json({
    metrics: {
      players,
      activePlayers,
      blockedPlayers,
      transactionCount,
      totalPointsInCirculation: balances[0]?.totalPoints || 0,
    },
    slotConfig: settings.slotConfig,
    recentActivity,
  });
};

export const getActivities = async (req, res) => {
  const activities = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('actor', 'name email role')
    .populate('targetUser', 'name email');

  res.json({ activities });
};

export const getSlotSettings = async (req, res) => {
  const settings = await getGameSettings();
  res.json({ slotConfig: settings.slotConfig });
};

export const updateSlotSettings = async (req, res) => {
  const settings = await getGameSettings();
  settings.slotConfig.winChancePercent = Number(req.body.winChancePercent);
  settings.slotConfig.spinCost = Number(req.body.spinCost);
  settings.slotConfig.payoutMultipliers.twoMatch = Number(req.body.twoMatchMultiplier);
  settings.slotConfig.payoutMultipliers.threeMatch = Number(req.body.threeMatchMultiplier);
  settings.slotConfig.payoutMultipliers.jackpot = Number(req.body.jackpotMultiplier);
  await settings.save();

  await logActivity({
    actorId: req.user._id,
    action: 'admin.updated_slot_settings',
    meta: {
      winChancePercent: settings.slotConfig.winChancePercent,
      spinCost: settings.slotConfig.spinCost,
      payoutMultipliers: settings.slotConfig.payoutMultipliers,
    },
    ipAddress: req.ip,
  });

  res.json({ slotConfig: settings.slotConfig });
};
