import mongoose from 'mongoose';

export const connectDb = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is required. Add your MongoDB Atlas connection string to server/.env');
  }

  await mongoose.connect(mongoUri);
};
