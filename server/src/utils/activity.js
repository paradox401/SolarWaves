import { ActivityLog } from '../models/ActivityLog.js';

export const logActivity = async ({
  actorId,
  targetUserId,
  action,
  meta = {},
  ipAddress = '',
}) => {
  await ActivityLog.create({
    actor: actorId || undefined,
    targetUser: targetUserId || undefined,
    action,
    meta,
    ipAddress,
  });
};
