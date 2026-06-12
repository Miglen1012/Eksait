import { apiRequest, withLanguageParam } from "./client";
import { normalizeProducts } from "../utils/products";
import { getStoredLanguage } from "../utils/language";
import { normalizeSearchText } from "../utils/search";

const productsCache = new Map();
const productsPromises = new Map();

export function getCachedProducts(language = getStoredLanguage()) {
  return productsCache.get(language) || null;
}

export function clearProductsCache(language) {
  if (language) {
    productsCache.delete(language);
    productsPromises.delete(language);
    return;
  }

  productsCache.clear();
  productsPromises.clear();
}

export async function fetchProducts({ force = false, language = getStoredLanguage() } = {}) {
  if (!force && productsCache.has(language)) {
    return productsCache.get(language);
  }

  if (!force && productsPromises.has(language)) {
    return productsPromises.get(language);
  }

  const productsPromise = apiRequest(withLanguageParam("/api/products", language))
    .then((data) => {
      const products = normalizeProducts(data, { language });
      productsCache.set(language, products);
      return products;
    })
    .finally(() => {
      productsPromises.delete(language);
    });

  productsPromises.set(language, productsPromise);
  return productsPromise;
}

export function prefetchProducts(language = getStoredLanguage()) {
  return fetchProducts({ language }).catch(() => null);
}

export async function searchProducts(query, { limit = 24, language = getStoredLanguage() } = {}) {
  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    return [];
  }

  try {
    const data = await apiRequest(withLanguageParam(`/api/products/search?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}`, language));
    return normalizeProducts(data, { language });
  } catch (error) {
    if (error?.status !== 404) {
      throw error;
    }
  }

  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const products = await fetchProducts({ language });
  return products.filter((product) => String(product.searchText || "").includes(normalizedQuery)).slice(0, limit);
}
