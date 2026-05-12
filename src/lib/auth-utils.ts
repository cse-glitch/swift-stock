import bcrypt from 'bcryptjs';
import { db, type UserRole } from '@/lib/db';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}

// ── Permission model ──────────────────────────────────────
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

// ── Session storage key ───────────────────────────────────
export const SESSION_KEY = 'saman_auth_session';

// ── Audit log helper for use anywhere in the app ──────────
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

// ── Seed the first admin user if no users exist ───────────
export async function seedAdminIfEmpty() {
  try {
    console.log('Auth: Ensuring admin users exist...');

    // Explicitly open the database to ensure it's ready and upgraded
    await db.open();

    const existingSuper = await db.users.where('username').equals('superadmin').first();
    if (!existingSuper) {
      console.log('Auth: Super Admin not found, creating default...');
      const hash = await bcrypt.hash('super123', 10);
      await db.users.add({
        id: crypto.randomUUID(),
        username: 'superadmin',
        passwordHash: hash,
        displayName: 'Super Administrator',
        role: 'super_admin',
        createdAt: new Date(),
        twoFactorEnabled: false
      });
    }

    const existingAdmin = await db.users.where('username').equals('admin').first();
    if (!existingAdmin) {
      console.log('Auth: Admin not found, creating default...');
      const hash = await bcrypt.hash('admin123', 10);
      await db.users.add({
        id: crypto.randomUUID(),
        username: 'admin',
        passwordHash: hash,
        displayName: 'Administrator',
        role: 'admin',
        createdAt: new Date(),
        twoFactorEnabled: false
      });
    }
  } catch (err) {
    console.error('Auth: Critical error during seeding:', err);
  }
}

