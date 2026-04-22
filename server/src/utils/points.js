import { PointTransaction } from '../models/PointTransaction.js';

export const applyPointChange = async ({
  user,
  actorId,
  type,
  amount,
  note = '',
}) => {
  const nextBalance = user.pointsBalance + amount;

  if (nextBalance < 0) {
    throw new Error('Insufficient points balance');
  }

  user.pointsBalance = nextBalance;
  await user.save();

  const transaction = await PointTransaction.create({
    user: user._id,
    actor: actorId || undefined,
    type,
    amount,
    balanceAfter: nextBalance,
    note,
  });

  return {
    balance: nextBalance,
    transaction,
  };
};
