"use client";

import { useState } from "react";

/** Visual only — Healthy's backend is OTP-only today, with no Google/Apple
 * OAuth wired up. Rather than a disabled/grayed button (which reads as
 * broken) or a fake success (which lies), a click surfaces an honest,
 * transient note instead of pretending to sign the user in. */
function SocialButton({
  provider,
  icon,
  onUnavailable,
}: {
  provider: string;
  icon: React.ReactNode;
  onUnavailable: (provider: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onUnavailable(provider)}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium text-[var(--color-text)] shadow-sm transition-all duration-150 hover:bg-[var(--color-surface-muted)] active:scale-[0.98] sm:h-12 sm:flex-1 sm:rounded-xl sm:text-sm"
    >
      {icon}
      Continue with {provider}
    </button>
  );
}

export function SocialLoginButtons() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div>
      <div className="my-3 flex items-center gap-3 sm:my-6" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-[11px] font-medium text-[var(--color-text-faint)] sm:text-xs">Or continue with</span>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <SocialButton
          provider="Google"
          onUnavailable={(p) => setNotice(`${p} sign-in isn't available yet — use your mobile number for now.`)}
          icon={
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M45.1 24.5c0-1.6-.1-3.1-.4-4.6H24v9h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1c4.2-3.9 6.6-9.6 6.6-16.5z"
              />
              <path
                fill="#34A853"
                d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z"
              />
              <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.5C3 17 2 20.4 2 24s1 7 4.5 10l7.3-5.7z" />
              <path
                fill="#EA4335"
                d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"
              />
            </svg>
          }
        />
        <SocialButton
          provider="Apple"
          onUnavailable={(p) => setNotice(`${p} sign-in isn't available yet — use your mobile number for now.`)}
          icon={
            <svg width="16" height="18" viewBox="0 0 17 20" fill="currentColor" aria-hidden="true">
              <path d="M13.9 10.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1.1 2.7-2.2.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.6-3.6zM11.6 3.9c.6-.7 1-1.7.9-2.6-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.5 1 .1 1.9-.5 2.5-1.2z" />
            </svg>
          }
        />
      </div>

      <p role="status" className="mt-2 min-h-[0.875rem] text-center text-[11px] text-[var(--color-text-muted)] sm:mt-3 sm:min-h-[1rem] sm:text-xs">
        {notice}
      </p>
    </div>
  );
}
