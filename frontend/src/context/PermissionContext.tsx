import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { Role } from '../types';

interface PermEntry {
  module: string;
  role: Role;
}

interface PermissionContextValue {
  email: string;
  permissions: PermEntry[];
  loading: boolean;
  /** true if the user has at least `minRole` on `module` (module='*' entries count everywhere) */
  can: (module: string, minRole: Role) => boolean;
}

const RANK: Record<Role, number> = { Viewer: 1, Editor: 2, Admin: 3 };

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<PermEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .whoami()
      .then((res) => {
        setEmail(res.email);
        setPermissions(res.permissions);
      })
      .finally(() => setLoading(false));
  }, []);

  const can = (moduleName: string, minRole: Role) =>
    permissions.some(
      (p) => (p.module === moduleName || p.module === '*') && RANK[p.role] >= RANK[minRole],
    );

  return (
    <PermissionContext.Provider value={{ email, permissions, loading, can }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within <PermissionProvider>');
  return ctx;
}
