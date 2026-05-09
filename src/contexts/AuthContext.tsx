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

        // Load initial permissions from DB
        const perms = await db.rolePermissions.toArray();
        const permMap: Record<UserRole, string[]> = { admin: [], manager: [], staff: [] };
        perms.forEach(p => {
          permMap[p.role] = p.permissions;
        });
        setRolePermissions(permMap);

        // --- NEW: Sync users and permissions before login for "Online App" feel ---
        try {
          console.log('AuthProvider: Syncing accounts from cloud...');
          await pullSupabaseToLocal(); // Pull all data to be safe, including users
          
          // Refresh permissions map after pull
          const updatedPerms = await db.rolePermissions.toArray();
          const updatedMap: Record<UserRole, string[]> = { admin: [], manager: [], staff: [] };
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

      const match = await bcrypt.compare(password, dbUser.passwordHash);
      if (!match) return { success: false, error: 'Invalid username or password' };

      const authUser: AuthUser = {
        id: dbUser.id as unknown as number, // Cast from UUID string to number if needed, or update interface
        username: dbUser.username,
        displayName: dbUser.displayName,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
      };

      await db.users.update(dbUser.id!, { lastLoginAt: new Date() });
      await db.auditLogs.add({
        userId: dbUser.id as unknown as number,
        username: dbUser.username,
        action: 'LOGIN',
        timestamp: new Date(),
      });

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
      setUser(authUser);

      // Perform initial pull after login
      pullSupabaseToLocal().catch(err => console.error('Login sync error:', err));

      return { success: true };
    } catch (err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const logout = useCallback(() => {
    if (user) {
      db.auditLogs.add({
        userId: user.id as unknown as number,
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
