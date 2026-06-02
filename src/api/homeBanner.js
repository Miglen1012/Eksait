import { API_URL, apiRequest } from "./client";

const HOME_BANNER_CACHE_KEY = "excompany_home_banner_cache";
const HOME_BANNER_CACHE_TTL_MS = 30 * 60 * 1000;

let homeBannerCache = readStoredHomeBanners();
let homeBannerPromise = null;

function resolveBannerImageUrl(value) {
  const rawUrl = String(value || "").trim();

  if (!rawUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
    return rawUrl;
  }

  if (rawUrl.startsWith("//")) {
    const protocol = globalThis.location?.protocol || "https:";
    return `${protocol}${rawUrl}`;
  }

  const normalizedPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `${API_URL}${normalizedPath}`;
}

function normalizeBannerItems(data) {
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

  return items.map((item, index) => ({
    id: item?.id ?? `banner-${index}`,
    eyebrow: item?.eyebrow || "",
    title: item?.title || "",
    subtitle: item?.subtitle || "",
    button_text: item?.button_text || "",
    button_url: item?.button_url || "",
    image_url: resolveBannerImageUrl(item?.image_url || item?.image || ""),
    sort_order: item?.sort_order ?? index,
  }));
}

function readStoredHomeBanners() {
  try {
    const rawValue = localStorage.getItem(HOME_BANNER_CACHE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const cachedAt = Number(parsed?.cachedAt);

    if (!items.length || !Number.isFinite(cachedAt)) {
      return null;
    }

    if (Date.now() - cachedAt > HOME_BANNER_CACHE_TTL_MS) {
      return null;
    }

    return items;
  } catch {
    return null;
  }
}

function storeHomeBanners(items) {
  try {
    localStorage.setItem(HOME_BANNER_CACHE_KEY, JSON.stringify({
      cachedAt: Date.now(),
      items,
    }));
  } catch {
    // Ignore storage failures; the in-memory cache still prevents repeated requests in this session.
  }
}

export function getCachedHomeBanners() {
  return homeBannerCache;
}

export function clearHomeBannersCache() {
  homeBannerCache = null;
  homeBannerPromise = null;

  try {
    localStorage.removeItem(HOME_BANNER_CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export async function fetchHomeBanners({ force = false } = {}) {
  if (!force && homeBannerCache) {
    return homeBannerCache;
  }

  if (!force && homeBannerPromise) {
    return homeBannerPromise;
  }

  homeBannerPromise = apiRequest("/api/home-banner")
    .then((data) => {
      const items = normalizeBannerItems(data);
      homeBannerCache = items;
      storeHomeBanners(items);
      return items;
    })
    .finally(() => {
      homeBannerPromise = null;
    });

  return homeBannerPromise;
}

export function prefetchHomeBanners() {
  return fetchHomeBanners().catch(() => null);
}
