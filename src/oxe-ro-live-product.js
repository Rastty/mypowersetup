import { parseOxeLiveOffer } from "./oxe-live-product.js";

// Compatibility entry point for existing Romania-specific tests.
export function parseOxeRomaniaLiveOffer(html) {
  return parseOxeLiveOffer(html, "ro");
}
