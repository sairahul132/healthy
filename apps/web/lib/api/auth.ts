import { apiFetch } from "./client";
import type { Identifier, Session, User } from "./types";

export interface OtpChallenge {
  identifier: Identifier;
  /** Seconds until the caller may request another OTP for this identifier. */
  retryAfterSeconds: number;
}

export function register(identifier: Identifier): Promise<OtpChallenge> {
  return apiFetch<OtpChallenge>("/auth/register", {
    method: "POST",
    body: { identifier },
  });
}

export function login(identifier: Identifier): Promise<OtpChallenge> {
  return apiFetch<OtpChallenge>("/auth/login", {
    method: "POST",
    body: { identifier },
  });
}

export function verifyOtp(
  identifier: Identifier,
  code: string,
): Promise<Session> {
  return apiFetch<Session>("/auth/verify-otp", {
    method: "POST",
    body: { identifier, code },
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export function getCurrentUser(): Promise<User> {
  return apiFetch<User>("/users/me");
}
