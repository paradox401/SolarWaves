import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

export const ensureAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Platform Admin';

  if (!adminEmail || !adminPassword) {
    return;
  }

  const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  if (existingAdmin) {
    existingAdmin.name = adminName;
    existingAdmin.email = adminEmail.toLowerCase();
    existingAdmin.passwordHash = passwordHash;

    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
    }

    await existingAdmin.save();
    return;
  }

  await User.create({
    name: adminName,
    email: adminEmail.toLowerCase(),
    passwordHash,
    role: 'admin',
    pointsBalance: 0,
  });
};
