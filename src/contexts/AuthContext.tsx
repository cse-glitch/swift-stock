import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { db, type User, type UserRole } from '@/lib/db';

interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
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

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'products.create', 'products.edit', 'products.delete',
    'orders.create', 'orders.edit', 'orders.delete',
    'inventory.add', 'inventory.remove',
    'businesses.manage', 'users.manage', 'settings.manage',
    'analytics.view', 'export.data',
  ],
  manager: [
    'products.create', 'products.edit',
    'orders.create', 'orders.edit',
    'inventory.add', 'inventory.remove',
    'analytics.view', 'export.data',
  ],
  staff: [
    'products.create',
    'orders.create',
    'inventory.add',
  ],
};

// ── Session storage key ───────────────────────────────────
const SESSION_KEY = 'saman_auth_session';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthUser;
        setUser(parsed);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const dbUser = await db.users.where('username').equals(username.trim().toLowerCase()).first();
      if (!dbUser) {
        return { success: false, error: 'Invalid username or password' };
      }

      const match = await bcrypt.compare(password, dbUser.passwordHash);
      if (!match) {
        return { success: false, error: 'Invalid username or password' };
      }

      const authUser: AuthUser = {
        id: dbUser.id!,
        username: dbUser.username,
        displayName: dbUser.displayName,
        role: dbUser.role,
      };

      // Update last login
      await db.users.update(dbUser.id!, { lastLoginAt: new Date() });

      // Write audit log
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
    return ROLE_PERMISSIONS[user.role].includes(permission);
  }, [user]);

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
  const count = await db.users.count();
  if (count === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.users.add({
      username: 'admin',
      passwordHash: hash,
      displayName: 'Administrator',
      role: 'admin',
      createdAt: new Date(),
    });
  }
}
