import { readCommunityAttribution } from "./community-attribution.js";

export function carryCommunityAttributionToUrl(href, { search = "", pageUrl = "https://mypowersetup.com/" } = {}) {
  const rawHref = String(href || "");
  if (!rawHref) return rawHref;

  const attribution = readCommunityAttribution(search);
  if (!attribution) return rawHref;

  let page;
  let destination;
  try {
    page = new URL(pageUrl);
    destination = new URL(rawHref, page);
  } catch {
    return rawHref;
  }

  if (!/^https?:$/.test(page.protocol) || destination.origin !== page.origin) return rawHref;

  destination.searchParams.set("utm_source", attribution.community_source);
  destination.searchParams.set("utm_medium", "community");
  destination.searchParams.set("utm_campaign", attribution.community_campaign);
  destination.searchParams.set("utm_content", attribution.community_opportunity_id);

  return `${destination.pathname}${destination.search}${destination.hash}`;
}
