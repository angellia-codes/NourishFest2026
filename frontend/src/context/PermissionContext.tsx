import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { ENTITY_ACCESS, type AccessLevel, type CurrentUser, type EntityName, type PermissionTier } from '../types';

interface PermissionContextValue {
  email: string;
  name: string;
  tier: PermissionTier;
  loading: boolean;
  isAdmin: boolean;
  /** Full access level for an entity under the caller's tier — 'special' means "has bespoke rules", not a blanket allow. */
  accessLevel: (entity: EntityName) => AccessLevel;
  canRead: (entity: EntityName) => boolean;
  /** True only for 'write'. Deliberately false for 'special' — callers with special rules (Ideas, Checklist) check accessLevel() themselves. */
  canWrite: (entity: EntityName) => boolean;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .me()
      .then(setUser)
      .finally(() => setLoading(false));
  }, [session]);

  const tier = user?.permission ?? 'none';

  const accessLevel = (entity: EntityName): AccessLevel =>
    tier === 'none' ? 'none' : ENTITY_ACCESS[entity][tier as 'Admin' | 'Advisor' | 'Member'] ?? 'none';

  const canRead = (entity: EntityName) => accessLevel(entity) !== 'none';
  const canWrite = (entity: EntityName) => accessLevel(entity) === 'write';

  return (
    <PermissionContext.Provider
      value={{
        email: user?.email ?? '',
        name: user?.name ?? '',
        tier,
        loading,
        isAdmin: tier === 'Admin',
        accessLevel,
        canRead,
        canWrite,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within <PermissionProvider>');
  return ctx;
}
