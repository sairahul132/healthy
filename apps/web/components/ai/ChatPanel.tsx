"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useConversationMessages, useCreateConversation, useSendMessage } from "@/lib/ai/hooks";
import type { AiMessage } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === "USER";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-[var(--color-brand)] text-[var(--color-brand-foreground)]"
            : "bg-[var(--color-surface-muted)] text-[var(--color-text)]",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export function ChatPanel({
  conversationId,
  onConversationCreated,
}: {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}) {
  const { data: messages, isLoading } = useConversationMessages(conversationId);
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isBusy = sendMessage.isPending || createConversation.isPending;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBusy]);

  async function handleSend() {
    const content = input.trim();
    if (!content || isBusy) return;
    setInput("");

    let id = conversationId;
    if (!id) {
      const conversation = await createConversation.mutateAsync();
      id = conversation.id;
      onConversationCreated(id);
    }
    sendMessage.mutate({ conversationId: id, content });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {conversationId && isLoading ? <LoadingState label="Loading conversation…" /> : null}
        {!conversationId ? (
          <p className="py-16 text-center text-sm text-[var(--color-text-muted)]">
            Ask Healthy can explain your results, summarize trends, and answer questions about
            your own health records. Nothing you ask leaves your account.
          </p>
        ) : null}
        {messages?.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isBusy ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[var(--color-surface-muted)] px-4 py-2.5 text-sm text-[var(--color-text-muted)]">
              Thinking…
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-[var(--color-border)] p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your health records…"
            rows={1}
            className="min-h-[2.5rem] flex-1 resize-none rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-brand)] focus:outline-none"
          />
          <Button size="md" onClick={() => void handleSend()} disabled={!input.trim()} isLoading={isBusy}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
