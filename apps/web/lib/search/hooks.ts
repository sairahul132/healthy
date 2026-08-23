"use client";

import { useQuery } from "@tanstack/react-query";
import { search } from "@/lib/api/reports";

export function useSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search", trimmed],
    queryFn: () => search(trimmed),
    enabled: trimmed.length >= 2,
  });
}
