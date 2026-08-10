import { httpAuthProvider } from "./http-auth-provider";
import type { AuthProvider } from "./provider";
// import { mockAuthProvider } from "@/lib/mock/mock-auth-provider";

/**
 * Single seam between UI code and authentication. apps/api now has real
 * /auth and /users routes (see apps/api/app/api/v1/), so this defaults to
 * the HTTP-backed provider. `mockAuthProvider` still exists for offline
 * frontend-only preview when apps/api isn't running — swap the import
 * above if you need that; nothing else should need to change.
 */
export function getAuthProvider(): AuthProvider {
  return httpAuthProvider;
}
