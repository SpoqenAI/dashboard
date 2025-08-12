// Shared termination policy helpers for Supabase Edge Functions (Deno-compatible)
// Keep this file dependency-free and safe for the Deno runtime.

export const TERMINATION_POLICY_SENTINEL = 'BEGIN_TERMINATION_POLICY v1';
export const TERMINATION_DISPLAY_NAME_FALLBACK = 'the business owner';

export const TERMINATION_POLICY_TEXT = `
${TERMINATION_POLICY_SENTINEL}

Termination policy (be extremely conservative):
- Only end the call if absolutely necessary. Prefer redirecting or taking a message.
- Acceptable reasons to end the call:
  1) Persistent off-topic conversation after two clarifying attempts
  2) Harassment, abusive language, or clear spam/robocall indicators
  3) Repeated refusal to provide a purpose for the call
- Before ending:
  - Give one brief, polite warning: "I can help when it's about {displayName}'s work. Should I take a message instead?"
  - If still off the rails, say a short closing line and end the call.
- Closing line guideline (keep it short):
  "Thanks for calling. I'll let {displayName} know you reached out. Goodbye."

When you choose to end the call, do it decisively after the closing line.`;

export function renderTerminationPolicy(displayName: string): string {
  return TERMINATION_POLICY_TEXT.replaceAll('{displayName}', displayName);
}

export function ensureTerminationPolicyAppended(
  systemPrompt: string | undefined | null,
  displayNameFallback: string = TERMINATION_DISPLAY_NAME_FALLBACK
): string {
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return renderTerminationPolicy(displayNameFallback);
  }
  if (systemPrompt.includes(TERMINATION_POLICY_SENTINEL)) {
    return systemPrompt;
  }
  const filled = renderTerminationPolicy(displayNameFallback);
  return `${systemPrompt.trim()}\n\n${filled.trim()}`;
}
