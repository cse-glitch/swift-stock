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

  // Restore session and seed admin on mount
  useEffect(() => {
    const init = async () => {
      console.log('AuthProvider: Initializing...');
      
      // Seed admin if needed
      await seedAdminIfEmpty();

      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as AuthUser;
          setUser(parsed);
          console.log('AuthProvider: Restored session for', parsed.username);
        } catch (err) {
          console.error('AuthProvider: Failed to restore session', err);
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
      setIsLoading(false);
      console.log('AuthProvider: Initialization complete.');
    };
    
    init();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      console.log('Attempting login for:', username);
      const dbUser = await db.users.where('username').equals(username.trim().toLowerCase()).first();
      
      if (!dbUser) {
        console.warn('User not found in database:', username);
        return { success: false, error: 'Invalid username or password' };
      }

      console.log('User found, comparing password hash (sync)...');
      const match = bcrypt.compareSync(password, dbUser.passwordHash);
      
      if (!match) {
        console.warn('Password mismatch for user:', username);
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
  try {
    const count = await db.users.count();
    console.log('Auth: Current user count:', count);
    
    if (count === 0) {
      console.log('Auth: Seeding initial admin user...');
      const hash = bcrypt.hashSync('admin123', 10);
      await db.users.add({
        username: 'admin',
        passwordHash: hash,
        displayName: 'Administrator',
        role: 'admin',
        createdAt: new Date(),
      });
      console.log('Auth: Admin user seeded successfully.');
    } else {
      // Check if admin user exists
      const admin = await db.users.where('username').equals('admin').first();
      if (!admin) {
        console.log('Auth: Admin missing, adding...');
        const hash = bcrypt.hashSync('admin123', 10);
        await db.users.add({
          username: 'admin',
          passwordHash: hash,
          displayName: 'Administrator',
          role: 'admin',
          createdAt: new Date(),
        });
      }
    }
  } catch (err) {
    console.error('Auth: Failed to seed admin user:', err);
  }
}

// Expose DB for debugging
if (typeof window !== 'undefined') {
  (window as any).db = db;
}
