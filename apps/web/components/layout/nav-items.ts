import type { IconName } from "./icons";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Section order follows docs/SPEC.md §81; items not yet built stay
   * visible (so users know what's coming) but are not clickable. */
  enabled: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "home", enabled: true },
  { label: "Reports", href: "/reports", icon: "reports", enabled: true },
  { label: "Health", href: "/health", icon: "health", enabled: true },
  { label: "Timeline", href: "/timeline", icon: "timeline", enabled: true },
  { label: "Search", href: "/search", icon: "search", enabled: true },
  { label: "Medicines", href: "/medicines", icon: "medicines", enabled: true },
  { label: "Share", href: "/share", icon: "share", enabled: true },
  { label: "Permissions", href: "/permissions", icon: "permissions", enabled: true },
  { label: "Ask Healthy", href: "/ask", icon: "assistant", enabled: true },
  { label: "Profile", href: "/profile", icon: "profile", enabled: true },
];
