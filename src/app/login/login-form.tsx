"use client";

import { useActionState } from "react";

import { ActionStatus } from "@/components/shared/action-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldTextClass } from "@/lib/ui-classes";

import { signIn, type LoginState } from "./actions";

const initial: LoginState = { ok: true, message: "" };
const FIELD = `h-8 rounded-md border-input bg-surface text-text-primary md:text-body ${fieldTextClass}`;

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-label text-text-secondary">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="you@especia.co.in"
          className={FIELD}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-label text-text-secondary">
          Password
        </Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className={FIELD} />
      </div>

      <ActionStatus state={!state.ok && state.message ? state : null} className="text-body font-medium" />

      {/* aria-disabled, not disabled: a disabled button drops focus to
          <body>. A repeat submit while signing in is cancelled below. */}
      <Button
        type="submit"
        size="sm"
        aria-disabled={pending || undefined}
        onClick={(e) => {
          if (pending) e.preventDefault();
        }}
        className="h-8 w-full rounded-md text-body aria-disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="pt-1 text-center text-label text-text-secondary">Accounts are created by your administrator.</p>
    </form>
  );
}
