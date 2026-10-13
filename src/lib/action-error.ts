/** Recovery step appended to messages for failures the person can retry. */
export const TRY_AGAIN = "Check your connection and try again.";

/**
 * Server Action failure: log the raw error (Supabase/Postgres/Storage text)
 * on the server with the action name, and hand the client a sentence that
 * says what didn't happen and what to do next.
 */
/**
 * The message of an error thrown by our own file parsers, which is written for
 * people ("Could not find the ageing header row …"). Persistence errors carry
 * the raw database text behind a function-name prefix
 * ("replaceAgeing(delete): …") and return null so the caller shows its own
 * recoverable sentence instead.
 */
export function parserMessage(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  return /^\w+(\([^)]*\))?: /.test(err.message) ? null : err.message;
}

export function actionFailed(
  action: string,
  error: unknown,
  message: string,
): { ok: false; message: string } {
  console.error(`[${action}]`, error);
  return { ok: false, message };
}
