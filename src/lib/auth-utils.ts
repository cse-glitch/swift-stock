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
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'orders.create'
  | 'orders.edit'
  | 'orders.delete'
  | 'inventory.add'
  | 'inventory.remove'
  | 'businesses.manage'
  | 'users.manage'
  | 'settings.manage'
  | 'analytics.view'
  | 'export.data';

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
    console.log('Auth: Ensuring admin user exists...');

    // Explicitly open the database to ensure it's ready and upgraded
    await db.open();

    const existing = await db.users.where('username').equals('admin').first();

    if (!existing) {
      console.log('Auth: Admin not found, creating default...');
      const hash = await bcrypt.hash('admin123', 10);
      await db.users.add({
        id: crypto.randomUUID(),
        username: 'admin',
        passwordHash: hash,
        displayName: 'Administrator',
        role: 'admin',
        createdAt: new Date(),
      });
      console.log('Auth: Admin user created successfully. Hash:', hash.substring(0, 10) + '...');
    } else {
      console.log('Auth: Admin user already exists with ID:', existing.id);
    }
  } catch (err) {
    console.error('Auth: Critical error during seeding:', err);
  }
}
