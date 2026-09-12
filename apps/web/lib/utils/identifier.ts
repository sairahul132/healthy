/** Display + URL helpers for phone/email identifiers on the auth screens.
 * Real confidentiality lives server-side (encrypt_field/hmac_lookup_hash,
 * §10) — these only keep the raw value off the screen and out of the
 * visible URL/browser history during the OTP hand-off.
 */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "9876543210" -> "••••••3210", "+919876543210" -> "+••••••••3210".
 * Emails keep the domain but blank the local part except its first
 * character, e.g. "aarav@example.com" -> "a****@example.com". */
export function maskIdentifier(identifier: string): string {
  if (emailPattern.test(identifier)) {
    const [local, domain] = identifier.split("@");
    const visible = local.slice(0, 1);
    return `${visible}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
  }

  const plus = identifier.startsWith("+") ? "+" : "";
  const digits = identifier.replace(/^\+/, "");
  if (digits.length <= 4) return `${plus}${digits}`;
  return `${plus}${"•".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

/** Reversible, non-secret encoding used only so a phone number/email
 * doesn't sit in plain text in the address bar, browser history, or
 * server access logs while navigating from the login/signup form to the
 * /verify screen. Not a security boundary — the value still travels to
 * verify-otp in the clear over HTTPS, same as any other API call. */
export function encodeIdentifierForUrl(identifier: string): string {
  const bytes = new TextEncoder().encode(identifier);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeIdentifierFromUrl(token: string): string | null {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
