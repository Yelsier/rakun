import { StrictMode } from "react";
import { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";

import {
  ManagerBrowserApp,
  createHttpManagerClient,
} from "@rakun/manager-react";
import "../../manager-react/src/styles/globals.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/rakun";
const basePath = import.meta.env.VITE_MANAGER_BASE_PATH || "/backend";

const client = createHttpManagerClient({
  baseUrl: apiBaseUrl,
});

const subscribeToLocation = (onStoreChange: () => void) => {
  window.addEventListener("popstate", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
  };
};

const getPreviewPathname = () => {
  const pathname = window.location.pathname;

  if (pathname === "/") {
    return basePath;
  }

  return pathname;
};

const getPreviewLocationKey = () => `${window.location.pathname}${window.location.search}`;

function PreviewManagerApp() {
  useSyncExternalStore(
    subscribeToLocation,
    getPreviewLocationKey,
    getPreviewLocationKey,
  );

  return (
    <ManagerBrowserApp
      client={client}
      pathname={getPreviewPathname()}
      searchParams={new URLSearchParams(window.location.search)}
      basePath={basePath}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PreviewManagerApp />
  </StrictMode>,
);
