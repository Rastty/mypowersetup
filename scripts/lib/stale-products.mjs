export function disableStaleProducts(products = []) {
  return products.map((product) => ({
    ...product,
    available: false,
    staleSource: true,
  }));
}
