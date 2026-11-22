// Keep the completed caravan result in view instead of returning visitors to
// the calculator introduction. The recommendation cards and buy links are
// already rendered and gated separately by the approved-stock catalog.
export function scrollToCaravanStep(step, {
  root = globalThis.document,
  reduceMotion = Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches),
} = {}) {
  const resultHeading = step === 3 ? root?.querySelector?.(".result-step .result-heading") : null;
  const target = resultHeading || root?.querySelector?.("#kalkulator");
  if (typeof target?.scrollIntoView !== "function") return false;
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  return true;
}
