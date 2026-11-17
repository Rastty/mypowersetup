// These images originate in reviewed affiliate merchant catalogs, not in
// user input. Keep the image fetches on known merchant/CDN product paths.
const IMAGE_PATHS = Object.freeze({
  "cdn.shopify.com": /^\/s\/files\/[^?#]+\.(?:avif|webp|png|jpe?g)$/i,
  "www.oxe.cz": /^\/galeria\/produkty\/[^?#]+\.(?:avif|webp|png|jpe?g)$/i,
});

export function safeExpansionProductImageUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim());
    const permittedPath = IMAGE_PATHS[url.hostname];
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash || !permittedPath?.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function renderExpansionProductMedia(product) {
  const url = safeExpansionProductImageUrl(product?.imageUrl);
  if (!url) return "";
  // The adjacent visible product name is its accessible label. A duplicated
  // alt string would make each recommendation unnecessarily repetitive.
  const src = url.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  return `<div class="expansion-product-media"><img src="${src}" alt="" width="320" height="200" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>`;
}
