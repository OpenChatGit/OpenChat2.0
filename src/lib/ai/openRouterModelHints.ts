/**
 * Heuristics for OpenRouter model IDs (keep in sync with `supabase/functions/premium-chat` POST body).
 * Used client-side for AI SDK `providerOptions` and post-stream handling.
 */

export function isOpenRouterNemotronFamily(modelId: string): boolean {
  return modelId.toLowerCase().includes('nemotron');
}

/** Models that typically benefit from reasoning-related API flags (not exhaustive). */
export function isOpenRouterReasoningHeuristic(modelId: string): boolean {
  const m = modelId.toLowerCase();
  return (
    m.includes('nemotron') ||
    m.includes('deepseek-r1') ||
    m.includes('o1-') ||
    m.includes('o3-') ||
    m.includes('thinking') ||
    m.includes('qwq')
  );
}

/** @deprecated alias — use `isOpenRouterReasoningHeuristic` */
export function isOpenRouterReasoningModel(modelId: string): boolean {
  return isOpenRouterReasoningHeuristic(modelId);
}

/** Nemotron-style: `reasoning: { enabled: true }` only — no `include_reasoning` mix (see OpenRouter docs). */
export function usesNemotronReasoningApiShape(modelId: string): boolean {
  return isOpenRouterNemotronFamily(modelId);
}

/** After streaming, merge `reasoning_details` from final message (Nemotron / similar OpenRouter behavior). */
export function shouldMergeReasoningDetailsFromFinalResponse(modelId: string): boolean {
  return isOpenRouterNemotronFamily(modelId);
}
