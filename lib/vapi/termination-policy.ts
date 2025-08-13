// Centralized termination policy for Vapi assistants
// Include a stable sentinel so we can idempotently apply/merge this content

export const TERMINATION_POLICY_SENTINEL = 'BEGIN_TERMINATION_POLICY v1';

// Single source of truth for display name fallback used in termination policy
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

/**
 * Renders the termination policy with the provided display name substituted.
 * This helper centralizes the substitution logic and makes unit testing easier.
 *
 * @param displayName - The name to substitute in the policy text
 * @returns The rendered termination policy text with substitutions applied
 */
export function renderTerminationPolicy(displayName: string): string {
  return TERMINATION_POLICY_TEXT.replaceAll('{displayName}', displayName);
}

export function ensureTerminationPolicyAppended(
  systemPrompt: string,
  displayNameFallback: string = TERMINATION_DISPLAY_NAME_FALLBACK
): string {
  if (!systemPrompt || typeof systemPrompt !== 'string')
    return renderTerminationPolicy(displayNameFallback);
  if (systemPrompt.includes(TERMINATION_POLICY_SENTINEL)) return systemPrompt;
  const filled = renderTerminationPolicy(displayNameFallback);
  return `${systemPrompt.trim()}\n\n${filled.trim()}`;
}

/**
 * Removes the developer-only termination policy sentinel and everything after it
 * from a provided prompt, returning only the user-editable portion for display
 * or persistence. Matches the UI behavior so the sentinel is never saved.
 */
export function stripTerminationPolicy(
  content: string | undefined | null
): string {
  if (typeof content !== 'string') return content || '';
  const idx = content.indexOf(TERMINATION_POLICY_SENTINEL);
  if (idx === -1) return content;
  return content.slice(0, idx).trimEnd();
}
