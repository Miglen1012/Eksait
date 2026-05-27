import { apiRequest } from "./client";
import { normalizeProducts } from "../utils/products";

let productsCache = null;
let productsPromise = null;

export function getCachedProducts() {
  return productsCache;
}

export function clearProductsCache() {
  productsCache = null;
  productsPromise = null;
}

export async function fetchProducts({ force = false } = {}) {
  if (!force && productsCache) {
    return productsCache;
  }

  if (!force && productsPromise) {
    return productsPromise;
  }

  productsPromise = apiRequest("/api/products")
    .then((data) => {
      productsCache = normalizeProducts(data);
      return productsCache;
    })
    .finally(() => {
      productsPromise = null;
    });

  return productsPromise;
}

export function prefetchProducts() {
  return fetchProducts().catch(() => null);
}
