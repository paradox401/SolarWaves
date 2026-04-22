import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'player'],
      default: 'player',
    },
    pointsBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model('User', userSchema);
