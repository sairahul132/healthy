"use client";

import { useQuery } from "@tanstack/react-query";
import * as reportsApi from "@/lib/api/reports";

export const healthKeys = {
  categories: ["health", "categories"] as const,
  categoryDetail: (id: string) => ["health", "categories", id] as const,
  trends: ["health", "trends"] as const,
};

export function useHealthCategories() {
  return useQuery({
    queryKey: healthKeys.categories,
    queryFn: () => reportsApi.listHealthCategories(),
  });
}

export function useHealthCategoryDetail(categoryId: string) {
  return useQuery({
    queryKey: healthKeys.categoryDetail(categoryId),
    queryFn: () => reportsApi.getHealthCategoryDetail(categoryId),
  });
}

export function useHealthTrends() {
  return useQuery({
    queryKey: healthKeys.trends,
    queryFn: () => reportsApi.getHealthTrends(),
  });
}
