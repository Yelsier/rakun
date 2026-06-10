"use client";

import type {
  EncodedContentType,
  ManagerUserSchema,
  Permission,
} from "@rakun-kit/core/client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { hasManagerPermissions } from "./permissions";

type SessionState = {
  user: ManagerUserSchema;
  setUser: (user: ManagerUserSchema) => void;
  hasPermissions: (permissions: Permission[]) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
};

const SessionStoreContext = createContext<StoreApi<SessionState> | null>(null);

export function createSessionStore(initialUser: ManagerUserSchema) {
  return createSessionStoreWithContentTypes(initialUser, []);
}

export function createSessionStoreWithContentTypes(
  initialUser: ManagerUserSchema,
  contentTypes: EncodedContentType[],
) {
  return createStore<SessionState>((set, get) => ({
    user: initialUser,
    setUser: (user) => set({ user }),
    hasPermissions: (permissions) => {
      const { user } = get();
      return hasManagerPermissions(user, permissions, contentTypes);
    },
    hasAnyPermission: (permissions) => {
      const { user } = get();
      return permissions.some((permission) =>
        hasManagerPermissions(user, [permission], contentTypes),
      );
    },
  }));
}

export type SessionProviderProps = {
  initialUser: ManagerUserSchema;
  contentTypes?: EncodedContentType[];
  children: ReactNode;
};

export function SessionProvider({
  initialUser,
  contentTypes = [],
  children,
}: SessionProviderProps) {
  const store = useMemo(
    () => createSessionStoreWithContentTypes(initialUser, contentTypes),
    [contentTypes, initialUser],
  );

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
