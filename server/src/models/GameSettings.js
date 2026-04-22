import mongoose from 'mongoose';

const gameSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    slotConfig: {
      winChancePercent: {
        type: Number,
        default: 28,
        min: 1,
        max: 95,
      },
      spinCost: {
        type: Number,
        default: 10,
        min: 1,
      },
      reels: {
        type: Number,
        default: 3,
        min: 3,
        max: 5,
      },
      symbols: {
        type: [String],
        default: ['sun', 'wave', 'star', 'moon', 'bolt'],
      },
      payoutMultipliers: {
        twoMatch: {
          type: Number,
          default: 1.5,
          min: 1,
        },
        threeMatch: {
          type: Number,
          default: 4,
          min: 1,
        },
        jackpot: {
          type: Number,
          default: 12,
          min: 1,
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

export const GameSettings = mongoose.model('GameSettings', gameSettingsSchema);
