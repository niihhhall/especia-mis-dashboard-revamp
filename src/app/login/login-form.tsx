"use client";

import { useActionState } from "react";

import { signIn, type LoginState } from "./actions";

const initial: LoginState = { ok: true, message: "" };

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="you@especia.co.in"
          className="h-10 w-full rounded-lg border border-border bg-muted/40 px-3 text-base text-foreground sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10 w-full rounded-lg border border-border bg-muted/40 px-3 text-base text-foreground sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {!state.ok && state.message && (
        <p
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      )}

      {/* aria-disabled, not disabled: a disabled button drops focus to
          <body>. A repeat submit while signing in is cancelled below. */}
      <button
        type="submit"
        aria-disabled={pending || undefined}
        onClick={(e) => {
          if (pending) e.preventDefault();
        }}
        className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-[scale,opacity] duration-150 ease-out hover:opacity-90 motion-safe:not-aria-disabled:active:scale-[0.96] motion-reduce:not-aria-disabled:active:opacity-80 aria-disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="pt-1 text-center text-xs text-muted-foreground">
        Accounts are created by your administrator.
      </p>
    </form>
  );
}
