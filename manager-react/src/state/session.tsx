"use client";

import {
  hasPermissions,
  type ManagerUserSchema,
  type Permission,
} from "@rakun/core/client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

type SessionState = {
  user: ManagerUserSchema;
  setUser: (user: ManagerUserSchema) => void;
  hasPermissions: (permissions: Permission[]) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
};

const SessionStoreContext = createContext<StoreApi<SessionState> | null>(null);

export function createSessionStore(initialUser: ManagerUserSchema) {
  return createStore<SessionState>((set, get) => ({
    user: initialUser,
    setUser: (user) => set({ user }),
    hasPermissions: (permissions) => {
      const { user } = get();
      return hasPermissions(user, permissions);
    },
    hasAnyPermission: (permissions) => {
      const { user } = get();
      return permissions.some((permission) => hasPermissions(user, [permission]));
    },
  }));
}

export type SessionProviderProps = {
  initialUser: ManagerUserSchema;
  children: ReactNode;
};

export function SessionProvider({
  initialUser,
  children,
}: SessionProviderProps) {
  const store = useMemo(() => createSessionStore(initialUser), [initialUser]);

  return (
    <SessionStoreContext.Provider value={store}>
      {children}
    </SessionStoreContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionStoreContext);

  if (!ctx) {
    throw new Error("useSession must be used within <SessionProvider>.");
  }

  return useStore(ctx);
}
