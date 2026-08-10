"use client";

import type { AccessRequest } from "@/lib/api/types";
import { getCategory } from "@/lib/health/categories";
import { formatRelative } from "@/lib/utils/format";
import {
  useAccessRequests,
  useApproveAccessRequest,
  useDeclineAccessRequest,
} from "@/lib/sharing/hooks";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

function RequestRow({ request }: { request: AccessRequest }) {
  const approveMutation = useApproveAccessRequest();
  const declineMutation = useDeclineAccessRequest();
  const category = getCategory(request.category);
  const isPending = approveMutation.isPending || declineMutation.isPending;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {request.recipientIdentifierMasked} wants access to{" "}
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true">{category.icon}</span>
              {category.label}
            </span>
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">&ldquo;{request.reason}&rdquo;</p>
          <p className="mt-1 text-xs text-[var(--color-text-faint)]">
            Requested {formatRelative(request.createdAt)} · {request.requestedDurationHours}h access
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          isLoading={approveMutation.isPending}
          disabled={isPending}
          onClick={() => approveMutation.mutate(request.id)}
        >
          Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          isLoading={declineMutation.isPending}
          disabled={isPending}
          onClick={() => declineMutation.mutate(request.id)}
        >
          Decline
        </Button>
      </div>
    </Card>
  );
}

export function PendingRequests() {
  const { data: requests, isLoading, isError, refetch } = useAccessRequests(true);

  if (isLoading) return <LoadingState label="Loading requests…" />;
  if (isError) {
    return (
      <ErrorState
        description="We couldn't load pending requests."
        action={
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }
  if (!requests || requests.length === 0) {
    return <EmptyState title="No pending requests" description="You're all caught up." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => (
        <RequestRow key={request.id} request={request} />
      ))}
    </div>
  );
}
