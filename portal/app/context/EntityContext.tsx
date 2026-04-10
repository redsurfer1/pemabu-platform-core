'use client';

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

export type AdminEntityContext = 'FLOMISMA_ADMIN' | 'PEMABU_ADMIN' | 'DUAL_ADMIN';

export type EntityContextValue = {
  entity: AdminEntityContext;
  /** For API headers: satisfy enforceSeparation / session integrity */
  headerContext: AdminEntityContext;
  setEntity: (entity: AdminEntityContext) => void;
};

const defaultValue: EntityContextValue = {
  entity: 'PEMABU_ADMIN',
  headerContext: 'PEMABU_ADMIN',
  setEntity: () => {},
};

const EntityContext = createContext<EntityContextValue>(defaultValue);

export function useEntity() {
  return useContext(EntityContext);
}

/** Use when calling admin APIs — pass in X-Admin-Entity-Context header */
export function useAdminEntityHeader(): Record<string, string> {
  const { headerContext } = useEntity();
  return { 'X-Admin-Entity-Context': headerContext };
}

type EntityProviderProps = {
  children: React.ReactNode;
  defaultEntity?: AdminEntityContext;
};

export function EntityProvider({ children, defaultEntity = 'PEMABU_ADMIN' }: EntityProviderProps) {
  const [entity, setEntityState] = useState<AdminEntityContext>(defaultEntity);

  const setEntity = useCallback((next: AdminEntityContext) => {
    setEntityState(next);
  }, []);

  const value = useMemo(
    (): EntityContextValue => ({
      entity,
      headerContext: entity,
      setEntity,
    }),
    [entity, setEntity]
  );

  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>;
}
