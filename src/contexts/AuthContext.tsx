import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { db, type UserRole, seedRolesIfEmpty } from '@/lib/db';
import SwiftStockLoader from '@/components/SwiftStockLoader';
import { pullSupabaseToLocal } from '@/lib/sync';
import { 
  type AuthUser, 
  type Permission, 
  SESSION_KEY, 
  seedAdminIfEmpty 
} from '@/lib/auth-utils';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

  // Restore session and seed admin on mount
  useEffect(() => {
    const init = async () => {
      try {
        console.log('AuthProvider: Initializing...');

        // Seed roles and admin if needed
        await seedRolesIfEmpty();
        await seedAdminIfEmpty();

        // Load initial permissions from DB
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

        // Sync from cloud with a 5-second timeout
        try {
          console.log('AuthProvider: Syncing accounts from cloud...');
          const timeout = new Promise<void>(resolve => setTimeout(resolve, 5000));
          await Promise.race([pullSupabaseToLocal(), timeout]);

          // Refresh permissions map after pull
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
          console.error('AuthProvider: Initial cloud sync failed:', syncErr);
        }

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

      const passwordHash: string = dbUser.passwordHash;
      const displayName: string = dbUser.displayName ?? dbUser.username;
      const userId: string = String(dbUser.id);

      if (!passwordHash) {
        console.error('Login error: passwordHash missing for user', dbUser.username);
        return { success: false, error: 'Account data is corrupted.' };
      }

      const match = await bcrypt.compare(password, passwordHash);
      if (!match) return { success: false, error: 'Invalid username or password' };

      const authUser: AuthUser = {
        id: userId,
        username: dbUser.username,
        displayName,
        role: dbUser.role,
        createdAt: dbUser.createdAt ?? new Date(),
      };

      try {
        await db.users.update(userId, { lastLoginAt: new Date() });
      } catch (e) { console.warn('Could not update lastLoginAt:', e); }

      try {
        await db.auditLogs.add({
          id: crypto.randomUUID(),
          userId,
          username: dbUser.username,
          action: 'LOGIN',
          timestamp: new Date(),
        });
      } catch (e) { console.warn('Could not write login audit log:', e); }

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
      setUser(authUser);

      pullSupabaseToLocal().catch(err => console.error('Login sync error:', err));

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
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

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    const userPerms = rolePermissions[user.role] || [];
    if (userPerms.includes('*')) return true; // Wildcard for Super Admin
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Expose DB for debugging (safe cast via unknown)
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['db'] = db;
}
