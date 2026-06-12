import { API_URL, apiRequest, withLanguageParam } from "./client";
import { getStoredLanguage } from "../utils/language";
import { getLocalizedText } from "../utils/localized";

const HOME_BANNER_CACHE_KEY = "excompany_home_banner_cache";
const HOME_BANNER_CACHE_TTL_MS = 30 * 60 * 1000;

const homeBannerCache = new Map();
const homeBannerPromises = new Map();

function getHomeBannerCacheKey(language) {
  return `${HOME_BANNER_CACHE_KEY}:${language}`;
}

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

function normalizeBannerItems(data, language) {
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

  return items.map((item, index) => ({
    id: item?.id ?? `banner-${index}`,
    eyebrow: getLocalizedText(item, ["eyebrow", "kicker", "label"], language),
    title: getLocalizedText(item, ["title", "heading", "name"], language),
    subtitle: getLocalizedText(item, ["subtitle", "description", "text"], language),
    button_text: getLocalizedText(item, ["button_text", "buttonText", "button_label", "buttonLabel"], language),
    button_url: item?.button_url || item?.buttonUrl || item?.url || "",
    image_url: resolveBannerImageUrl(item?.image_url || item?.imageUrl || item?.image || ""),
    sort_order: item?.sort_order ?? index,
  }));
}

function readStoredHomeBanners(language) {
  try {
    const rawValue = localStorage.getItem(getHomeBannerCacheKey(language));

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

function storeHomeBanners(items, language) {
  try {
    localStorage.setItem(getHomeBannerCacheKey(language), JSON.stringify({
      cachedAt: Date.now(),
      items,
    }));
  } catch {
    // Ignore storage failures; the in-memory cache still prevents repeated requests in this session.
  }
}

export function getCachedHomeBanners(language = getStoredLanguage()) {
  if (homeBannerCache.has(language)) {
    return homeBannerCache.get(language);
  }

  const storedItems = readStoredHomeBanners(language);

  if (storedItems) {
    homeBannerCache.set(language, storedItems);
  }

  return storedItems;
}

export function clearHomeBannersCache(language) {
  if (language) {
    homeBannerCache.delete(language);
    homeBannerPromises.delete(language);

    try {
      localStorage.removeItem(getHomeBannerCacheKey(language));
    } catch {
      // Ignore storage failures.
    }

    return;
  }

  homeBannerCache.clear();
  homeBannerPromises.clear();

  try {
    ["bg", "en", "de"].forEach((currentLanguage) => {
      localStorage.removeItem(getHomeBannerCacheKey(currentLanguage));
    });
    localStorage.removeItem(HOME_BANNER_CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export async function fetchHomeBanners({ force = false, language = getStoredLanguage() } = {}) {
  if (!force && homeBannerCache.has(language)) {
    return homeBannerCache.get(language);
  }

  if (!force && homeBannerPromises.has(language)) {
    return homeBannerPromises.get(language);
  }

  const homeBannerPromise = apiRequest(withLanguageParam("/api/home-banner", language))
    .then((data) => {
      const items = normalizeBannerItems(data, language);
      homeBannerCache.set(language, items);
      storeHomeBanners(items, language);
      return items;
    })
    .finally(() => {
      homeBannerPromises.delete(language);
    });

  homeBannerPromises.set(language, homeBannerPromise);
  return homeBannerPromise;
}

export function prefetchHomeBanners(language = getStoredLanguage()) {
  return fetchHomeBanners({ language }).catch(() => null);
}
