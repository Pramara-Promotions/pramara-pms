// web/src/main.jsx
import React from "react";
import "./index.css";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { router } from "./app-router";
import AuthProvider from "./features/common/AuthProvider";
import { ToastProvider } from "./ui/toast/ToastProvider";

// Create a react-query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

export function RootApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function getOrCreateRootElement() {
  const existingRoot = document.getElementById("root");
  if (existingRoot) {
    return existingRoot;
  }

  // In dev builds Vite auto-injects a root element, but keep a fallback in case it's missing.
  const fallbackRoot = document.createElement("div");
  fallbackRoot.id = "root";
  document.body.appendChild(fallbackRoot);
  return fallbackRoot;
}

const rootElement = getOrCreateRootElement();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
