"use client";

import { useConversations } from "@/lib/ai/hooks";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";

export function ConversationList({
  selectedId,
  onSelect,
  onNew,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const { data: conversations, isLoading } = useConversations();

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button size="sm" className="w-full" onClick={onNew}>
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? <LoadingState label="Loading chats…" /> : null}
        {conversations && conversations.length === 0 ? (
          <p className="px-2 py-4 text-xs text-[var(--color-text-faint)]">
            No conversations yet — start one above.
          </p>
        ) : null}
        {conversations?.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={cn(
              "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
              conversation.id === selectedId
                ? "bg-[var(--color-brand)]/10 text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]",
            )}
          >
            <p className="truncate font-medium">{conversation.title ?? "New chat"}</p>
            <p className="text-xs text-[var(--color-text-faint)]">
              {formatRelative(conversation.updatedAt)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
