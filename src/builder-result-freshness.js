// A full Builder result is valid only for the inputs that produced it.
// Undo the purchase and share surface before accepting any changed input.
const RESULT_SELECTORS = Object.freeze([
  "#result-grid",
  "#package-variants",
  "#recommendation-groups",
  "#result-reasons",
  "#consumption-breakdown",
  "#result-notes",
  "#system-diagram",
  "#installation-plan",
  "#charging-options",
  "#roof-fit",
  "#power-station-profile",
]);

export function invalidateBuilderResult({ resultStep, hasResult, onInvalidate } = {}) {
  if (!resultStep || typeof hasResult !== "function" || !hasResult()) return false;
  // Clear old recommendations, share/print content and result-derived advice.
  // Hiding only the result step is not sufficient: the user can navigate back.
  for (const selector of RESULT_SELECTORS) {
    resultStep.querySelector?.(selector)?.replaceChildren?.();
  }
  for (const selector of ["#result-intro", "#result-verdict", "#result-product-count", "#result-share-status", "#print-generated-at"]) {
    const node = resultStep.querySelector?.(selector);
    if (node) node.textContent = "";
  }
  const resultNext = resultStep.querySelector?.("#result-next");
  if (resultNext) resultNext.hidden = true;
  const productLink = resultStep.querySelector?.("#result-products-link");
  if (productLink) productLink.hidden = true;
  const comparison = resultStep.querySelector?.(".existing-setup-output");
  if (comparison) {
    comparison.hidden = true;
    comparison.replaceChildren?.();
  }
  onInvalidate?.();
  return true;
}

export function bindBuilderResultInvalidation({ form, resultStep, hasResult, onInvalidate } = {}) {
  const invalidate = () => invalidateBuilderResult({ resultStep, hasResult, onInvalidate });
  if (typeof form?.addEventListener === "function") {
    const handleChange = (event) => {
      // Existing-setup controls in result step must not invalidate the
      // calculation; only changed *sizing inputs* in steps 1/2 do so.
      const step = event.target?.closest?.(".form-step");
      if (step?.dataset?.step === "1" || step?.dataset?.step === "2") invalidate();
    };
    form.addEventListener("input", handleChange);
    form.addEventListener("change", handleChange);
  }
  // Usage profiles set checked/value directly and do not dispatch DOM changes.
  return invalidate;
}
