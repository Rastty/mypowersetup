export function groupExpansionProductsForDisclosure(products = []) {
  const groups = [];
  const byCategory = new Map();

  for (const item of products || []) {
    if (!item?.category) continue;
    let group = byCategory.get(item.category);
    if (!group) {
      group = { category: item.category, items: [] };
      byCategory.set(item.category, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  return Object.freeze(groups.map(({ category, items }) => Object.freeze({
    category,
    primary: items[0] || null,
    alternatives: Object.freeze(items.slice(1)),
  })));
}
