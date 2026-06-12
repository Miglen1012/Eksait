import { apiRequest, withLanguageParam } from "./client";
import { normalizeProducts } from "../utils/products";
import { getStoredLanguage } from "../utils/language";

const equipmentCache = new Map();
const equipmentPromises = new Map();

export function getCachedEquipmentProducts(language = getStoredLanguage()) {
  return equipmentCache.get(language) || null;
}

export function clearEquipmentCache(language) {
  if (language) {
    equipmentCache.delete(language);
    equipmentPromises.delete(language);
    return;
  }

  equipmentCache.clear();
  equipmentPromises.clear();
}

export async function fetchEquipmentProducts({ force = false, language = getStoredLanguage() } = {}) {
  if (!force && equipmentCache.has(language)) {
    return equipmentCache.get(language);
  }

  if (!force && equipmentPromises.has(language)) {
    return equipmentPromises.get(language);
  }

  const equipmentPromise = apiRequest(withLanguageParam("/api/equipment", language))
    .then((data) => {
      const products = normalizeProducts(data, { language });
      equipmentCache.set(language, products);
      return products;
    })
    .finally(() => {
      equipmentPromises.delete(language);
    });

  equipmentPromises.set(language, equipmentPromise);
  return equipmentPromise;
}

export async function searchEquipmentProducts(query, { limit = 24, language = getStoredLanguage() } = {}) {
  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    return [];
  }

  const data = await apiRequest(withLanguageParam(`/api/equipment/search?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}`, language));
  return normalizeProducts(data, { language });
}
