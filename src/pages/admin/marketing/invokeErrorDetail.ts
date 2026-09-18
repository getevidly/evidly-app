/**
 * The real reason behind a failed functions.invoke().
 *
 * supabase-js reports any non-2xx from an edge function as a FunctionsHttpError
 * with `data === null`, so the function's own body — the sentence that says what
 * actually went wrong — is only reachable through `error.context`, the raw
 * Response. Reading just `error.message` renders every failure as
 * "Edge Function returned a non-2xx status code".
 *
 * Every read is guarded: the body may be absent, already consumed, or not JSON.
 * Falls back to error.message, which is never worse than what was shown before.
 *
 * Lives in its own module rather than on OutreachTab: OutreachTab imports
 * useCountyBriefingActions, so the hook importing back from the page would be a
 * circular import.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function invokeErrorDetail(err: any): Promise<string> {
  try {
    const body = await err?.context?.json?.();
    const detail = body?.error || body?.message;
    if (typeof detail === 'string' && detail.trim()) return detail;
  } catch {
    // Not JSON, or the body was already read — fall through to text.
  }
  try {
    const text = await err?.context?.text?.();
    if (typeof text === 'string' && text.trim()) return text;
  } catch {
    // Body unavailable — fall through to the generic message.
  }
  return err?.message || 'Unknown error';
}
