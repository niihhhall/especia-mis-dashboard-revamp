"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/action-status";

import { postQuery, postReply, type QueryState } from "./actions";

const initial: QueryState = { ok: true, message: "" };

function Status({ state }: { state: QueryState }) {
  return <ActionStatus state={state} className="text-xs not-empty:mt-1.5" />;
}

export function NewQueryForm() {
  const [state, action, pending] = useActionState(postQuery, initial);
  return (
    <form action={action} className="card-surface p-4">
      <label htmlFor="body" className="text-sm font-semibold text-foreground">
        Ask your CA a question
      </label>
      <textarea
        id="body"
        name="body"
        rows={3}
        required
        placeholder="e.g. Why did closing stock move so much in June?"
        className="mt-2 w-full rounded-lg border border-border bg-muted/40 p-3 text-base text-foreground sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <Status state={state} />
        <button
          type="submit"
          disabled={pending}
          className="h-9 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[scale,opacity] duration-150 ease-out hover:opacity-90 motion-safe:not-disabled:active:scale-[0.96] motion-reduce:not-disabled:active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}

export function ReplyForm({ queryId }: { queryId: string }) {
  const [state, action, pending] = useActionState(postReply, initial);
  return (
    <form action={action} className="mt-3 border-t border-border pt-3">
      <input type="hidden" name="queryId" value={queryId} />
      <div className="flex items-start gap-2">
        <input
          name="body"
          required
          aria-label="Write a reply"
          className="h-9 flex-1 rounded-lg border border-border bg-muted/40 px-3 text-base text-foreground sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-9 shrink-0 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Sending…" : "Reply"}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}
