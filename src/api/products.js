import { apiRequest } from "./client";
import { normalizeProducts } from "../utils/products";
import { normalizeSearchText } from "../utils/search";

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

export async function searchProducts(query, { limit = 24 } = {}) {
  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    return [];
  }

  try {
    const data = await apiRequest(`/api/products/search?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}`);
    return normalizeProducts(data);
  } catch (error) {
    if (error?.status !== 404) {
      throw error;
    }
  }

  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const products = await fetchProducts();
  return products.filter((product) => String(product.searchText || "").includes(normalizedQuery)).slice(0, limit);
}
