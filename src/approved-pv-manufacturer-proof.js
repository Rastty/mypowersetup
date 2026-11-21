// Exact already-approved panel SKU identity, dealer destination, local currency
// and eHub campaign attribution. Manufacturer electrical evidence is allowed
// only after this strict check; it cannot authorize a new merchant or a
// shared-variant landing page that does not identify the selected SKU.
export function exactApprovedPvSku(product,record) {
  if (!record || product?.merchant!==record.merchant || product?.category!=="solar_panel"
    || product.name!==record.name || product.priceCurrency!==record.currency
    || product.productUrl!==record.url) return false;
  try {
    const url=new URL(product.affiliateUrl);
    return url.origin==="https://ehub.cz"
      && url.pathname==="/system/scripts/click.php"
      && !url.username && !url.password && !url.hash
      && url.searchParams.size===3
      && ["a_aid","a_bid","desturl"].every(key=>url.searchParams.getAll(key).length===1)
      && url.searchParams.get("a_aid")==="f34c86c8"
      && url.searchParams.get("a_bid")===record.bid
      && url.searchParams.get("desturl")===record.url;
  } catch { return false; }
}

export function mergeExactPvManufacturerSpecs(product,specs,record,expected) {
  if (!exactApprovedPvSku(product,record) || !specs
    || specs.powerW!==expected.powerW
    || Object.entries(expected).some(([key,value])=>
      specs[key]!=null && specs[key]!==value)) return specs;
  return {...specs,...expected};
}
