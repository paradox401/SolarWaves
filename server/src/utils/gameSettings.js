import { GameSettings } from '../models/GameSettings.js';

const defaultConfig = {
  key: 'default',
  slotConfig: {
    winChancePercent: 28,
    spinCost: 10,
    reels: 3,
    symbols: ['sun', 'wave', 'star', 'moon', 'bolt'],
    payoutMultipliers: {
      twoMatch: 1.5,
      threeMatch: 4,
      jackpot: 12,
    },
  },
};

export const getGameSettings = async () => {
  const settings = await GameSettings.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: defaultConfig },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return settings;
};
