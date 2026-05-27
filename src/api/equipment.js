import { apiRequest } from "./client";
import { fetchProducts } from "./products";
import { normalizeProducts } from "../utils/products";
import { isEquipmentProduct } from "../utils/equipment";

let equipmentCache = null;
let equipmentPromise = null;

export function getCachedEquipmentProducts() {
  return equipmentCache;
}

export function clearEquipmentCache() {
  equipmentCache = null;
  equipmentPromise = null;
}

export async function fetchEquipmentProducts({ force = false } = {}) {
  if (!force && equipmentCache) {
    return equipmentCache;
  }

  if (!force && equipmentPromise) {
    return equipmentPromise;
  }

  equipmentPromise = (async () => {
    try {
      const data = await apiRequest("/api/equipment");
      equipmentCache = normalizeProducts(data);
      return equipmentCache;
    } catch (error) {
      if (error?.status !== 404) {
        throw error;
      }

      equipmentCache = (await fetchProducts({ force })).filter(isEquipmentProduct);
      return equipmentCache;
    }
  })().finally(() => {
    equipmentPromise = null;
  });

  return equipmentPromise;
}
