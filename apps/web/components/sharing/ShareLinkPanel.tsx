"use client";

import { useState } from "react";
import type { SharingSession } from "@/lib/api/types";
import { getCategory } from "@/lib/health/categories";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";

export function ShareLinkPanel({
  session,
  onDone,
}: {
  session: SharingSession;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(session.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the link is still selectable/visible below.
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-[var(--status-green)]/25 bg-[var(--status-green-tint)] px-5 py-4">
        <p className="text-sm font-semibold text-[var(--status-green)]">Secure link created</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Save this now — for their protection, Healthify can&apos;t show it to you again.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-3.5 py-2.5">
        <code className="flex-1 overflow-x-auto whitespace-nowrap text-sm text-[var(--color-text)]">
          {session.shareUrl}
        </code>
        <Button type="button" size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {session.categoryIds.map((id) => {
          const category = getCategory(id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
            >
              <span aria-hidden="true">{category.icon}</span>
              {category.label}
            </span>
          );
        })}
      </div>

      <p className="text-xs text-[var(--color-text-faint)]">
        Shared with {session.recipientIdentifierMasked} · Expires {formatDate(session.expiresAt)}.
        They&apos;ll need to verify their own identity with a one-time code before seeing anything.
      </p>

      <div>
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Create another share
        </Button>
      </div>
    </div>
  );
}
