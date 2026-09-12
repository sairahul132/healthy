import type { UpdateProfileInput } from "@/lib/api/profile";
import type { Identifier, Session, User } from "@/lib/api/types";

export interface OtpChallenge {
  identifier: Identifier;
  retryAfterSeconds: number;
  /** Seconds until this code stops being acceptable — drives the countdown
   * shown on the verify screen. */
  expiresInSeconds: number;
}

/**
 * Provider interface for authentication (docs/SPEC.md §137/§138
 * provider-abstraction pattern) — mirrors lib/reports/provider.ts. Swapping
 * the mock implementation for one backed by apps/api's future /auth
 * endpoints should require no changes outside lib/auth/get-provider.ts.
 */
export interface AuthProvider {
  register(identifier: Identifier): Promise<OtpChallenge>;
  login(identifier: Identifier): Promise<OtpChallenge>;
  verifyOtp(identifier: Identifier, code: string): Promise<Session>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User>;
  updateProfile(input: UpdateProfileInput): Promise<User>;
}
