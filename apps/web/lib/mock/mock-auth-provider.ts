import type { UpdateProfileInput } from "@/lib/api/profile";
import { ApiError, type Identifier, type Session, type User } from "@/lib/api/types";
import type { AuthProvider, OtpChallenge } from "@/lib/auth/provider";

/**
 * ⚠️ MOCK — in-browser fake for local development only.
 *
 * apps/api has no /auth or /users routes yet (see docs/ROADMAP.md), so
 * there is nothing real to log in against. This accepts any identifier and
 * any 6-digit code, and fabricates a session stored in localStorage —
 * purely so the rest of the app (which assumes an authenticated user) can
 * be built and previewed. It never runs against real credentials and must
 * be swapped for httpAuthProvider once apps/api ships real auth endpoints
 * (see lib/auth/get-provider.ts).
 */

const STORAGE_KEY = "healthy_mock_session_v1";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function unauthenticatedError(): ApiError {
  return new ApiError(401, {
    error: { code: "UNAUTHENTICATED", message: "Not logged in.", requestId: "mock" },
  });
}

function randomSegment(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generateHealthyId(): string {
  return `HLT-${randomSegment(4)}-${randomSegment(4)}`;
}

function buildDemoUser(identifier: Identifier): User {
  const isEmail = emailPattern.test(identifier);
  return {
    healthyId: generateHealthyId(),
    name: "Aarav Sharma",
    dateOfBirth: "1990-04-12",
    sex: "male",
    phone: isEmail ? "+91 98765 43210" : identifier,
    email: isEmail ? identifier : "aarav.sharma@example.com",
    bloodGroup: "O+",
    emergencyContact: { name: "Priya Sharma", relationship: "Spouse", phone: "+91 98123 45678" },
    allergies: ["Penicillin"],
    currentMedications: ["Metformin 500mg"],
    preferredLanguage: "en",
    createdAt: new Date().toISOString(),
  };
}

function readSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeSession(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    // The real backend sets an httpOnly cookie proxy.ts checks for; the
    // mock stands in with a plain (non-httpOnly) cookie of the same name
    // purely so the route-protection UX behaves the same in this demo.
    document.cookie = "hfy_refresh=mock; path=/; max-age=2592000; SameSite=Lax";
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
    document.cookie = "hfy_refresh=; path=/; max-age=0";
  }
}

async function delay(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

let pendingIdentifier: Identifier | null = null;

export const mockAuthProvider: AuthProvider = {
  async register(identifier: Identifier): Promise<OtpChallenge> {
    await delay(400);
    pendingIdentifier = identifier;
    return { identifier, retryAfterSeconds: 30 };
  },

  async login(identifier: Identifier): Promise<OtpChallenge> {
    await delay(400);
    pendingIdentifier = identifier;
    return { identifier, retryAfterSeconds: 30 };
  },

  async verifyOtp(identifier: Identifier): Promise<Session> {
    await delay(500);
    // Demo mode accepts any 6-digit code (already validated client-side by
    // otpFormSchema) — there is no real OTP to check against.
    const user = buildDemoUser(pendingIdentifier ?? identifier);
    writeSession(user);
    return { user };
  },

  async logout(): Promise<void> {
    await delay(150);
    writeSession(null);
  },

  async getCurrentUser(): Promise<User> {
    await delay(150);
    const user = readSession();
    if (!user) throw unauthenticatedError();
    return user;
  },

  async updateProfile(input: UpdateProfileInput): Promise<User> {
    await delay(400);
    const existing = readSession();
    if (!existing) throw unauthenticatedError();
    const updated: User = {
      ...existing,
      name: input.name !== undefined ? input.name : existing.name,
      dateOfBirth: input.dateOfBirth !== undefined ? input.dateOfBirth : existing.dateOfBirth,
      sex: input.sex !== undefined ? input.sex : existing.sex,
      bloodGroup: input.bloodGroup !== undefined ? input.bloodGroup : existing.bloodGroup,
      emergencyContact:
        input.emergencyContact !== undefined ? input.emergencyContact : existing.emergencyContact,
      allergies: input.allergies ?? existing.allergies,
      currentMedications: input.currentMedications ?? existing.currentMedications,
    };
    writeSession(updated);
    return updated;
  },
};
