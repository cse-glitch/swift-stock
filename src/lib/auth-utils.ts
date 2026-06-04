import bcrypt from 'bcryptjs';
import { db, type User, type UserRole, initializeDatabase } from '@/lib/db';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}

export type Permission =
  | '*' // Super Admin wildcard
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'orders.create'
  | 'orders.edit'
  | 'orders.delete'
  | 'inventory.add'
  | 'inventory.remove'
  | 'inventory.transfer'
  | 'businesses.manage'
  | 'users.manage'
  | 'settings.manage'
  | 'analytics.view'
  | 'export.data'
  | 'suppliers.manage'
  | 'warehouses.manage'
  | 'accounting.view'
  | 'accounting.manage'
  | 'notifications.manage';

export const SESSION_KEY = 'saman_auth_session';

export async function writeAuditLog(
  user: AuthUser | null,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: object
) {
  await db.auditLogs.add({
    id: crypto.randomUUID(),
    userId: user?.id,
    username: user?.username ?? 'system',
    action,
    entityType,
    entityId,
    details: details ? JSON.stringify(details) : undefined,
    timestamp: new Date(),
  });
}

const DEFAULT_ACCOUNTS = [
  { username: 'superadmin', password: 'super123', displayName: 'Super Administrator', role: 'super_admin' as const },
  { username: 'admin', password: 'admin123', displayName: 'Administrator', role: 'admin' as const },
];

export async function seedAdminIfEmpty() {
  try {
    console.log('Auth: Ensuring admin users exist...');

    await initializeDatabase();

    for (const account of DEFAULT_ACCOUNTS) {
      const existing = await db.users.where('username').equals(account.username).first();
      if (!existing) {
        console.log(`Auth: ${account.username} not found, creating default...`);
        const hash = await bcrypt.hash(account.password, 10);
        await db.users.add({
          id: crypto.randomUUID(),
          username: account.username,
          passwordHash: hash,
          displayName: account.displayName,
          role: account.role,
          createdAt: new Date(),
          twoFactorEnabled: false,
        });
        continue;
      }

      const legacyHash = (existing as User & { password_hash?: string }).password_hash;
      if (!existing.passwordHash && !legacyHash) {
        console.log(`Auth: Repairing missing password for ${account.username}...`);
        const hash = await bcrypt.hash(account.password, 10);
        await db.users.update(existing.id, { passwordHash: hash });
      } else if (!existing.passwordHash && legacyHash) {
        await db.users.update(existing.id, { passwordHash: legacyHash });
      }
    }
  } catch (err) {
    console.error('Auth: Critical error during seeding:', err);
  }
}

