import { PointTransaction } from '../models/PointTransaction.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { applyPointChange } from '../utils/points.js';
import { logActivity } from '../utils/activity.js';
import { getGameSettings } from '../utils/gameSettings.js';

const MIN_SPIN_BET = 1;
const MAX_SPIN_BET = 100;
const choose = (items) => items[Math.floor(Math.random() * items.length)];
const withSpinLimits = (slotConfig) => ({
  ...slotConfig,
  minSpinBet: MIN_SPIN_BET,
  maxSpinBet: MAX_SPIN_BET,
});

const buildLosingReels = (symbols, reels) => {
  const result = [];

  while (result.length < reels) {
    const symbol = choose(symbols);
    result.push(symbol);
  }

  if (new Set(result).size === 1) {
    result[result.length - 1] = symbols.find((item) => item !== result[0]) || result[0];
  }

  return result;
};

const buildWinningReels = (symbols) => {
  const roll = Math.random();

  if (roll < 0.16) {
    const jackpot = choose(symbols);
    return {
      reels: [jackpot, jackpot, jackpot],
      tier: 'jackpot',
    };
  }

  if (roll < 0.48) {
    const triple = choose(symbols);
    return {
      reels: [triple, triple, triple],
      tier: 'threeMatch',
    };
  }

  const match = choose(symbols);
  const miss = symbols.find((item) => item !== match) || match;
  const variants = [
    [match, match, miss],
    [match, miss, match],
    [miss, match, match],
  ];

  return {
    reels: choose(variants),
    tier: 'twoMatch',
  };
};

export const getPlayerDashboard = async (req, res) => {
  const [transactions, activities, settings] = await Promise.all([
    PointTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(12),
    ActivityLog.find({ targetUser: req.user._id }).sort({ createdAt: -1 }).limit(12),
    getGameSettings(),
  ]);

  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      pointsBalance: req.user.pointsBalance,
      status: req.user.status,
    },
    slotConfig: withSpinLimits(settings.slotConfig),
    transactions,
    activities,
  });
};

export const spinSlots = async (req, res) => {
  const settings = await getGameSettings();
  const { spinCost, winChancePercent, symbols, payoutMultipliers } = settings.slotConfig;
  const requestedBet = Number(req.body.betAmount ?? spinCost);

  if (!Number.isInteger(requestedBet) || requestedBet < MIN_SPIN_BET || requestedBet > MAX_SPIN_BET) {
    return res.status(400).json({
      message: `Bet amount must be an integer between ${MIN_SPIN_BET} and ${MAX_SPIN_BET}`,
    });
  }

  if (req.user.pointsBalance < requestedBet) {
    return res.status(400).json({ message: 'Not enough points to spin' });
  }

  await applyPointChange({
    user: req.user,
    actorId: req.user._id,
    type: 'spin_bet',
    amount: -requestedBet,
    note: `Slot spin bet (${requestedBet})`,
  });

  const didWin = Math.random() * 100 < winChancePercent;
  const outcome = didWin
    ? buildWinningReels(symbols)
    : {
        reels: buildLosingReels(symbols, 3),
        tier: 'loss',
      };

  const multiplier =
    outcome.tier === 'twoMatch'
      ? payoutMultipliers.twoMatch
      : outcome.tier === 'threeMatch'
        ? payoutMultipliers.threeMatch
        : outcome.tier === 'jackpot'
          ? payoutMultipliers.jackpot
          : 0;
  const payout = Math.floor(requestedBet * multiplier);

  let winTransaction = null;
  let finalBalance = req.user.pointsBalance;

  if (payout > 0) {
    const result = await applyPointChange({
      user: req.user,
      actorId: req.user._id,
      type: 'slot_win',
      amount: payout,
      note: `Slot payout for ${outcome.tier}`,
    });
    winTransaction = result.transaction;
    finalBalance = result.balance;
  }

  await logActivity({
    actorId: req.user._id,
    targetUserId: req.user._id,
    action: 'player.spun_slots',
    meta: {
      reels: outcome.reels,
      tier: outcome.tier,
      spinCost: requestedBet,
      payout,
      balanceAfter: finalBalance,
      configuredWinChancePercent: winChancePercent,
    },
    ipAddress: req.ip,
  });

  res.json({
    reels: outcome.reels,
    tier: outcome.tier,
    payout,
    spinCost: requestedBet,
    net: payout - requestedBet,
    balance: finalBalance,
    slotConfig: withSpinLimits(settings.slotConfig),
    transaction: winTransaction,
  });
};
