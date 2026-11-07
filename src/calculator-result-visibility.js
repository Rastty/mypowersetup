// A previously computed result is not evidence for the current form values.
// Hide its links as well as metrics until the visitor recalculates.
export function invalidateCalculatedResult({ resultPanel, errorPanel, staleNotice } = {}) {
  if (!resultPanel || !errorPanel || !staleNotice) return false;
  resultPanel.hidden = true;
  errorPanel.hidden = true;
  staleNotice.hidden = false;
  return true;
}
