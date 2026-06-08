"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ManagerRuntimeAuthValue = {
  refreshAuth: () => Promise<boolean>;
};

const fallbackRuntimeAuthValue: ManagerRuntimeAuthValue = {
  refreshAuth: async () => true,
};

const ManagerRuntimeAuthContext =
  createContext<ManagerRuntimeAuthValue | null>(null);

export type ManagerRuntimeAuthProviderProps = {
  value: ManagerRuntimeAuthValue;
  children: ReactNode;
};

export const ManagerRuntimeAuthProvider = ({
  value,
  children,
}: ManagerRuntimeAuthProviderProps) => {
  return (
    <ManagerRuntimeAuthContext.Provider value={value}>
      {children}
    </ManagerRuntimeAuthContext.Provider>
  );
};

export const useManagerRuntimeAuth = () =>
  useContext(ManagerRuntimeAuthContext) ?? fallbackRuntimeAuthValue;
