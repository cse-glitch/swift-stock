import { useState, useEffect, useCallback, type ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { db, type UserRole, type User, seedRolesIfEmpty, initializeDatabase } from '@/lib/db';
import SwiftStockLoader from '@/components/SwiftStockLoader';
import { pullSupabaseToLocal } from '@/lib/sync';
import { 
  type AuthUser, 
  type Permission, 
  SESSION_KEY, 
  seedAdminIfEmpty 
} from '@/lib/auth-utils';
import { AuthContext, type AuthContextValue } from './use-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>({
    super_admin: ['*'],
    admin: [],
    manager: [],
    inventory_manager: [],
    sales_manager: [],
    accountant: [],
    cashier: [],
    warehouse_staff: [],
    staff: []
  });

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        await seedRolesIfEmpty();
        await seedAdminIfEmpty();

        const perms = await db.rolePermissions.toArray();
        const permMap: Record<UserRole, string[]> = {
          super_admin: ['*'],
          admin: [],
          manager: [],
          inventory_manager: [],
          sales_manager: [],
          accountant: [],
          cashier: [],
          warehouse_staff: [],
          staff: []
        };
        perms.forEach(p => {
          permMap[p.role] = p.permissions;
        });
        setRolePermissions(permMap);

        try {
          const timeout = new Promise<void>(resolve => setTimeout(resolve, 5000));
          await Promise.race([pullSupabaseToLocal(), timeout]);
          await seedAdminIfEmpty();

          const updatedPerms = await db.rolePermissions.toArray();
          const updatedMap: Record<UserRole, string[]> = {
            super_admin: ['*'],
            admin: [],
            manager: [],
            inventory_manager: [],
            sales_manager: [],
            accountant: [],
            cashier: [],
            warehouse_staff: [],
            staff: []
          };
          updatedPerms.forEach(p => {
            updatedMap[p.role] = p.permissions;
          });
          setRolePermissions(updatedMap);
        } catch (syncErr) {
          console.error(syncErr);
        }

        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as AuthUser & { _expiry?: string };
            if (parsed._expiry && new Date() > new Date(parsed._expiry)) {
              sessionStorage.removeItem(SESSION_KEY);
            } else {
              const { _expiry: _, ...user } = parsed;
              setUser(user);
            }
          } catch (err) {
            sessionStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const normalizedUsername = username.trim().toLowerCase();

      const dbUser = await db.users.where('username').equals(normalizedUsername).first();
      if (!dbUser) return { success: false, error: 'Invalid username or password' };

      if (dbUser.lockedUntil && new Date() < new Date(dbUser.lockedUntil)) {
        const remaining = Math.ceil((new Date(dbUser.lockedUntil).getTime() - Date.now()) / 60000);
        return { success: false, error: `Account locked. Try again in ${remaining} minute(s).` };
      }

      const legacyHash = (dbUser as User & { password_hash?: string }).password_hash;
      const passwordHash: string = dbUser.passwordHash || legacyHash || '';
      const displayName: string = dbUser.displayName ?? dbUser.username;
      const userId: string = String(dbUser.id);

      if (!passwordHash) {
        return {
          success: false,
          error: 'This account has no password set. Ask an admin to reset it in Team settings.',
        };
      }

      if (!dbUser.passwordHash && legacyHash) {
        await db.users.update(userId, { passwordHash: legacyHash }).catch(() => {});
      }

      const match = await bcrypt.compare(password, passwordHash);

      if (!match) {
        const attempts = (dbUser.failedAttempts ?? 0) + 1;
        const MAX_ATTEMPTS = 5;
        const updateData: Record<string, unknown> = { failedAttempts: attempts };
        if (attempts >= MAX_ATTEMPTS) {
          const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
          updateData.lockedUntil = lockUntil;
          await db.users.update(userId, updateData as Partial<User>);
          await db.auditLogs.add({ id: crypto.randomUUID(), userId, username: dbUser.username, action: 'ACCOUNT_LOCKED', timestamp: new Date() });
          return { success: false, error: 'Too many failed attempts. Account locked for 30 minutes.' };
        }
        await db.users.update(userId, updateData as Partial<User>);
        return { success: false, error: `Invalid username or password. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.` };
      }

      const sessionExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const authUser: AuthUser = {
        id: userId,
        username: dbUser.username,
        displayName,
        role: dbUser.role,
        createdAt: dbUser.createdAt ?? new Date(),
      };

      await db.users.update(userId, { lastLoginAt: new Date(), failedAttempts: 0, lockedUntil: undefined } as Partial<User>);

      await db.auditLogs.add({
        id: crypto.randomUUID(),
        userId,
        username: dbUser.username,
        action: 'LOGIN',
        timestamp: new Date(),
      }).catch(() => {});

      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...authUser, _expiry: sessionExpiry.toISOString() }));
      setUser(authUser);

      pullSupabaseToLocal().catch(err => console.error(err));

      return { success: true };
    } catch (err) {
      return { success: false, error: `Login failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }, []);

  const logout = useCallback(() => {
    if (user) {
      db.auditLogs.add({
        id: crypto.randomUUID(),
        userId: user.id,
        username: user.username,
        action: 'LOGOUT',
        timestamp: new Date(),
      });
    }
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
      }, 30 * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, logout]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    const userPerms = rolePermissions[user.role] || [];
    if (userPerms.includes('*')) return true;
    return userPerms.includes(permission);
  }, [user, rolePermissions]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-[100]">
        <div className="w-32 h-32">
          <SwiftStockLoader />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

