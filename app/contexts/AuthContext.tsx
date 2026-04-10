'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import {
  normalizeTrustRole,
  AuthUser,
  hasTrustCenterAccess,
  canModifyControls,
  getTrustRolePermissions,
} from '@/src/lib/auth-context';

/** Client-local trust tier (no @prisma/client). */
type TrustRole = 'PUBLIC' | 'USER' | 'ADVISOR' | 'ADMIN';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasTrustCenterAccess: boolean;
  canModifyControls: boolean;
  permissions: ReturnType<typeof getTrustRolePermissions>;
  login: (user: AuthUser) => void;
  logout: () => void;
  setTrustRole: (role: TrustRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('pemabu_auth_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as AuthUser;
          if (parsed?.trustRole != null) {
            parsed.trustRole = normalizeTrustRole(parsed.trustRole);
          }
          setUser(parsed);
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          localStorage.removeItem('pemabu_auth_user');
        }
      }
    }
  }, []);

  const login = (authUser: AuthUser) => {
    setUser(authUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pemabu_auth_user', JSON.stringify(authUser));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pemabu_auth_user');
    }
  };

  const setTrustRole = (role: TrustRole) => {
    if (user) {
      const updatedUser = { ...user, trustRole: role };
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pemabu_auth_user', JSON.stringify(updatedUser));
      }
    }
  };

  const isAuthenticated = user !== null;
  const trustCenterAccess = hasTrustCenterAccess(user?.trustRole);
  const controlModification = canModifyControls(user?.trustRole);
  const permissions = user ? getTrustRolePermissions(user.trustRole) : getTrustRolePermissions('PUBLIC');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        hasTrustCenterAccess: trustCenterAccess,
        canModifyControls: controlModification,
        permissions,
        login,
        logout,
        setTrustRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const DEFAULT_PERMISSIONS = getTrustRolePermissions('PUBLIC');

const DEFAULT_AUTH: AuthContextType = {
  user: null,
  isAuthenticated: false,
  hasTrustCenterAccess: false,
  canModifyControls: false,
  permissions: DEFAULT_PERMISSIONS,
  login: () => {},
  logout: () => {},
  setTrustRole: () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context ?? DEFAULT_AUTH;
}
