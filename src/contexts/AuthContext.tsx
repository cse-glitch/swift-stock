import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { db, type User, type UserRole } from '@/lib/db';
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
      
      // Test bcrypt
      try {
        console.log('Auth: Bcrypt object type:', typeof bcrypt);
        const testHash = await bcrypt.hash('test', 10);
        const testMatch = await bcrypt.compare('test', testHash);
        console.log('Auth: Bcrypt self-test:', testMatch ? 'PASSED' : 'FAILED', 'Hash prefix:', testHash.substring(0, 7));
      } catch (e) {
        console.error('Auth: Bcrypt self-test ERROR:', e);
      }
      
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
      const normalizedUsername = username.trim().toLowerCase();

      // Emergency rescue: if admin is locked out
      if (normalizedUsername === 'admin' && password === 'RESET_ADMIN') {
        console.warn('Auth: Triggering emergency admin reset...');
        const hash = await bcrypt.hash('admin123', 10);
        const admin = await db.users.where('username').equals('admin').first();
        if (admin) {
          await db.users.update(admin.id!, { passwordHash: hash });
        } else {
          await db.users.add({
            username: 'admin',
            passwordHash: hash,
            displayName: 'Administrator',
            role: 'admin',
            createdAt: new Date(),
          });
        }
        return { success: false, error: 'Admin reset to admin123. Try again.' };
      }

      const dbUser = await db.users.where('username').equals(normalizedUsername).first();
      
      if (!dbUser) {
        console.warn('User not found in database:', username);
        // Debug: log available users to console
        const allUsers = await db.users.toArray();
        console.log('Available users:', allUsers.map(u => u.username));
        return { success: false, error: 'Invalid username or password' };
      }

      console.log('User found, comparing password hash...');
      console.log('Input password length:', password.length);
      console.log('Stored hash length:', dbUser.passwordHash.length);
      console.log('Hash prefix:', dbUser.passwordHash.substring(0, 10));
      
      let match = false;
      try {
        match = await bcrypt.compare(password, dbUser.passwordHash);
      } catch (err) {
        console.error('Auth: Comparison error:', err);
        return { success: false, error: 'Authentication service error' };
      }
      
      if (!match) {
        console.warn('Password mismatch for user:', username);
        return { success: false, error: 'Invalid username or password' };
      }

      const authUser: AuthUser = {
        id: dbUser.id!,
        username: dbUser.username,
        displayName: dbUser.displayName,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
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
