"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/layout/app-shell";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cached data is served instantly when switching between sections;
            // a background refetch keeps it current.
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
          },
        },
      })
  );

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "rgba(18, 26, 42, 0.92)",
                border: "1px solid rgba(148,163,184,0.2)",
                color: "#E8EEF9",
                borderRadius: "12px",
                backdropFilter: "blur(16px)",
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
