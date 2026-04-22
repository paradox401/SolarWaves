import dotenv from 'dotenv';
import { app } from './app.js';
import { connectDb } from './config/db.js';
import { ensureAdmin } from './seed/ensureAdmin.js';

dotenv.config();

const port = process.env.PORT || 5000;

const start = async () => {
  await connectDb();
  await ensureAdmin();

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
