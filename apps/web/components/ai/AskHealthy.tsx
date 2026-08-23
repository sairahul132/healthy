"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ChatPanel } from "./ChatPanel";
import { ConversationList } from "./ConversationList";

export function AskHealthy() {
  const [conversationId, setConversationId] = useState<string | null>(null);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Ask Healthy</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Ask questions about your own reports, results, and medicines.
      </p>

      <Card className="mt-6 grid h-[32rem] grid-cols-1 overflow-hidden sm:grid-cols-[16rem_1fr]">
        <div className="border-b border-[var(--color-border)] sm:border-b-0 sm:border-r">
          <ConversationList
            selectedId={conversationId}
            onSelect={setConversationId}
            onNew={() => setConversationId(null)}
          />
        </div>
        <ChatPanel conversationId={conversationId} onConversationCreated={setConversationId} />
      </Card>
    </div>
  );
}
