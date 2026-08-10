import * as authApi from "@/lib/api/auth";
import { updateProfile } from "@/lib/api/profile";
import type { AuthProvider } from "./provider";

/** Real implementation — calls apps/api's documented /auth and /users
 * endpoints. Not wired up as the default yet because those routes don't
 * exist server-side; see lib/auth/get-provider.ts. */
export const httpAuthProvider: AuthProvider = {
  register: authApi.register,
  login: authApi.login,
  verifyOtp: authApi.verifyOtp,
  logout: authApi.logout,
  getCurrentUser: authApi.getCurrentUser,
  updateProfile,
};
