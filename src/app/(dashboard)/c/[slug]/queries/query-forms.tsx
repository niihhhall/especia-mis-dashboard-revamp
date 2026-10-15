"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldTextClass } from "@/lib/ui-classes";

import { postQuery, postReply, type QueryState } from "./actions";

const initial: QueryState = { ok: true, message: "" };
const FIELD = `rounded-md border-border bg-surface text-text-primary md:text-body ${fieldTextClass}`;

function Status({ state }: { state: QueryState }) {
  return <ActionStatus state={state} className="text-label not-empty:mt-2" />;
}

export function NewQueryForm() {
  const [state, action, pending] = useActionState(postQuery, initial);
  return (
    <form action={action} className="rounded-lg border border-border bg-surface p-5">
      <Label htmlFor="body" className="text-card-title text-text-primary">
        Ask your CA a question
      </Label>
      <Textarea
        id="body"
        name="body"
        rows={3}
        required
        placeholder="e.g. Why did closing stock move so much in June?"
        className={`mt-2 ${FIELD}`}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <Status state={state} />
        <Button type="submit" size="sm" disabled={pending} className="h-8 shrink-0 rounded-md text-body">
          {pending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}

export function ReplyForm({ queryId }: { queryId: string }) {
  const [state, action, pending] = useActionState(postReply, initial);
  return (
    <form action={action} className="mt-4 border-t border-border pt-4">
      <input type="hidden" name="queryId" value={queryId} />
      <div className="flex items-start gap-2">
        <Input name="body" required aria-label="Write a reply" className={`h-8 flex-1 ${FIELD}`} />
        <Button type="submit" variant="outline" size="sm" disabled={pending} className="h-8 shrink-0 rounded-md text-body">
          {pending ? "Sending…" : "Reply"}
        </Button>
      </div>
      <Status state={state} />
    </form>
  );
}
