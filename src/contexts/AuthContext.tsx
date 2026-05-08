import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { db, type User, type UserRole, seedRolesIfEmpty } from '@/lib/db';
import SwiftStockLoader from '@/components/SwiftStockLoader';

interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
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
const SESSION_KEY = 'saman_auth_session';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>({
    admin: [], manager: [], staff: []
  });

  // Restore session and seed admin on mount
  useEffect(() => {
    const init = async () => {
      try {
        console.log('AuthProvider: Initializing...');

        // Seed roles and admin if needed
        await seedRolesIfEmpty();
        await seedAdminIfEmpty();

        // Load permissions from DB
        const perms = await db.rolePermissions.toArray();
        const permMap: any = {};
        perms.forEach(p => {
          permMap[p.role] = p.permissions;
        });
        setRolePermissions(permMap);

        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as AuthUser;
            setUser(parsed);
          } catch (err) {
            sessionStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (err) {
        console.error('AuthProvider init error:', err);
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

      const match = await bcrypt.compare(password, dbUser.passwordHash);
      if (!match) return { success: false, error: 'Invalid username or password' };

      const authUser: AuthUser = {
        id: dbUser.id!,
        username: dbUser.username,
        displayName: dbUser.displayName,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
      };

      await db.users.update(dbUser.id!, { lastLoginAt: new Date() });
      await db.auditLogs.add({
        userId: dbUser.id,
        username: dbUser.username,
        action: 'LOGIN',
        timestamp: new Date(),
      });

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
      setUser(authUser);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const logout = useCallback(() => {
    if (user) {
      db.auditLogs.add({
        userId: user.id,
        username: user.username,
        action: 'LOGOUT',
        timestamp: new Date(),
      });
    }
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, [user]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    const userPerms = rolePermissions[user.role] || [];
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ── Audit log helper for use anywhere in the app ──────────
export async function writeAuditLog(
  user: AuthUser | null,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: object
) {
  await db.auditLogs.add({
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
        username: 'admin',
        passwordHash: hash,
        displayName: 'Administrator',
        role: 'admin',
        createdAt: new Date(),
      });
      console.log('Auth: Admin user created successfully. Hash:', hash.substring(0, 10) + '...');
    } else {
      console.log('Auth: Admin user already exists with ID:', existing.id);
      // Optional: verify if admin password works, if not, we could log a warning
      // but we shouldn't auto-reset it for security reasons unless explicitly requested.
    }
  } catch (err) {
    console.error('Auth: Critical error during seeding:', err);
    // If it fails, try to just clear the table and re-add? No, that's too much.
  }
}

// Expose DB for debugging
if (typeof window !== 'undefined') {
  (window as any).db = db;
}
