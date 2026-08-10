"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext } from "react";
import { getAuthProvider } from "@/lib/auth/get-provider";
import { ApiError } from "@/lib/api/types";
import type { User } from "@/lib/api/types";

export const SESSION_QUERY_KEY = ["session", "me"] as const;

interface SessionContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated" | "unreachable";
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const query = useQuery<User, unknown>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => getAuthProvider().getCurrentUser(),
    retry: false,
    staleTime: 60_000,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await getAuthProvider().logout();
    } finally {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    }
  }, [queryClient]);

  let status: SessionContextValue["status"] = "loading";
  if (!query.isLoading) {
    if (query.data) {
      status = "authenticated";
    } else if (query.error instanceof ApiError && query.error.status === 401) {
      status = "unauthenticated";
    } else if (query.error) {
      // Network error, backend unreachable, etc. — distinct from "not logged
      // in" so the UI can say so instead of silently bouncing to /login.
      status = "unreachable";
    } else {
      status = "unauthenticated";
    }
  }

  return (
    <SessionContext.Provider value={{ user: query.data ?? null, status, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
