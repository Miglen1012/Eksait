import { storeAuthReturnPath } from "../utils/authRedirect";
import { getStoredLanguage, translate } from "../utils/language";

function normalizeApiBaseUrl(value) {
  return String(value || "")
    .split(",")[0]
    .trim()
    .replace(/\/$/, "");
}

function getDefaultApiBaseUrl() {
  if (globalThis.location?.hostname === "test.eksait.com") {
    return "https://admin.test.eksait.com";
  }

  return "http://localhost:8000";
}

const configuredApiUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
const runtimeOrigin = normalizeApiBaseUrl(globalThis.location?.origin);
const API_URL = (
  configuredApiUrl === runtimeOrigin && globalThis.location?.hostname === "test.eksait.com"
    ? "https://admin.test.eksait.com"
    : configuredApiUrl
) || getDefaultApiBaseUrl();
const CART_SESSION_KEY = "cart_session_id";
const LEGACY_CART_SESSION_KEY = "excompany_cart_session_id";
const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_CACHE_KEY = "auth_user";
const AUTH_USER_CACHE_TTL_MS = 30 * 60 * 1000;
const CART_SESSION_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const DEFAULT_RETRY_AFTER_SECONDS = 60;
const DEFAULT_ERROR_KEY = "error.default";
const CONNECTION_ERROR_KEY = "error.connection";
let currentUserPromise = null;
let currentUserMemoryCache = null;

function getDefaultErrorMessage() {
  return translate(DEFAULT_ERROR_KEY);
}

function getConnectionErrorMessage() {
  return translate(CONNECTION_ERROR_KEY);
}

function createSessionId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getCartSessionId() {
  const storedSessionId = localStorage.getItem(CART_SESSION_KEY);

  if (CART_SESSION_PATTERN.test(storedSessionId || "")) {
    return storedSessionId;
  }

  const legacySessionId = localStorage.getItem(LEGACY_CART_SESSION_KEY);

  if (CART_SESSION_PATTERN.test(legacySessionId || "")) {
    localStorage.setItem(CART_SESSION_KEY, legacySessionId);
    localStorage.removeItem(LEGACY_CART_SESSION_KEY);
    return legacySessionId;
  }

  const sessionId = createSessionId();
  localStorage.setItem(CART_SESSION_KEY, sessionId);
  localStorage.removeItem(LEGACY_CART_SESSION_KEY);
  return sessionId;
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function getApiBaseUrl() {
  return API_URL;
}

export function setAuthToken(token, { remember = true } = {}) {
  if (!token) {
    return;
  }

  clearAuthToken();

  if (remember) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

function clearAuthUserCache() {
  currentUserPromise = null;
  currentUserMemoryCache = null;
  localStorage.removeItem(AUTH_USER_CACHE_KEY);
  sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  clearAuthUserCache();
}

function getCurrentAuthStorage() {
  if (localStorage.getItem(AUTH_TOKEN_KEY)) {
    return localStorage;
  }

  if (sessionStorage.getItem(AUTH_TOKEN_KEY)) {
    return sessionStorage;
  }

  return localStorage;
}

function isUsableUser(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasUserIdentity(value) {
  return Boolean(
    value?.id ||
    value?.email ||
    value?.name ||
    value?.full_name ||
    value?.phone ||
    value?.customer_email ||
    value?.customer_phone,
  );
}

export function getAuthUserFromResponse(data) {
  return [
    data?.user,
    data?.data?.user,
    data?.customer,
    data?.data?.customer,
    data?.data,
    data,
  ].find((candidate) => isUsableUser(candidate) && hasUserIdentity(candidate)) || null;
}

export function getCachedAuthUser() {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  if (
    currentUserMemoryCache?.token === token &&
    Date.now() - currentUserMemoryCache.cachedAt < AUTH_USER_CACHE_TTL_MS &&
    isUsableUser(currentUserMemoryCache.user)
  ) {
    return currentUserMemoryCache.user;
  }

  const cachedPayloads = [localStorage, sessionStorage].map((storage) => {
    try {
      return JSON.parse(storage.getItem(AUTH_USER_CACHE_KEY) || "null");
    } catch {
      return null;
    }
  });

  const cachedPayload = cachedPayloads.find((payload) => (
    payload?.token === token &&
    Date.now() - Number(payload.cachedAt) < AUTH_USER_CACHE_TTL_MS &&
    isUsableUser(payload.user)
  ));

  if (!cachedPayload) {
    return null;
  }

  currentUserMemoryCache = cachedPayload;
  return cachedPayload.user;
}

export function storeAuthUser(user, { remember } = {}) {
  const token = getAuthToken();
  const normalizedUser = getAuthUserFromResponse(user);

  if (!token || !isUsableUser(normalizedUser)) {
    return;
  }

  const payload = {
    token,
    user: normalizedUser,
    cachedAt: Date.now(),
  };
  const storage = typeof remember === "boolean"
    ? remember ? localStorage : sessionStorage
    : getCurrentAuthStorage();

  currentUserMemoryCache = payload;
  storage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(payload));

  if (storage === localStorage) {
    sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
  } else {
    localStorage.removeItem(AUTH_USER_CACHE_KEY);
  }
}

export async function fetchCurrentUser({ force = false } = {}) {
  if (!getAuthToken()) {
    return null;
  }

  const cachedUser = force ? null : getCachedAuthUser();

  if (cachedUser) {
    return cachedUser;
  }

  if (currentUserPromise) {
    return currentUserPromise;
  }

  currentUserPromise = apiRequest("/api/me")
    .then((data) => {
      const user = getAuthUserFromResponse(data);
      storeAuthUser(user);
      return user;
    })
    .finally(() => {
      currentUserPromise = null;
    });

  return currentUserPromise;
}

function handleUnauthorizedResponse() {
  if (!getAuthToken()) {
    return;
  }

  storeAuthReturnPath();
  clearAuthToken();

  if (window.location.pathname !== "/login") {
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new Event("app:navigate"));
  }
}

export function getTokenFromResponse(data) {
  return data?.token || data?.access_token || data?.plainTextToken || data?.data?.token;
}

function getCartSessionIdFromResponse(data) {
  return data?.session_id ||
    data?.cart_session_id ||
    data?.cartSessionId ||
    data?.cart?.session_id ||
    data?.cart?.cart_session_id ||
    data?.cart?.cartSessionId ||
    data?.data?.session_id ||
    data?.data?.cart_session_id ||
    data?.data?.cartSessionId ||
    data?.data?.cart?.session_id ||
    data?.data?.cart?.cart_session_id ||
    data?.data?.cart?.cartSessionId;
}

function storeCartSessionId(sessionId) {
  if (!CART_SESSION_PATTERN.test(String(sessionId || ""))) {
    return;
  }

  localStorage.setItem(CART_SESSION_KEY, sessionId);
  localStorage.removeItem(LEGACY_CART_SESSION_KEY);
}

function buildHeaders() {
  const token = getAuthToken();
  const language = getStoredLanguage();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Language": language,
    "X-Cart-Session-Id": getCartSessionId(),
    "X-Locale": language,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function withLanguageParam(path, language = getStoredLanguage()) {
  const safeLanguage = ["bg", "en", "de"].includes(language) ? language : "bg";
  const [pathnameAndSearch, hash = ""] = String(path || "").split("#");
  const [pathname, rawSearch = ""] = pathnameAndSearch.split("?");
  const search = new URLSearchParams(rawSearch);

  search.set("lang", safeLanguage);

  const nextSearch = search.toString();
  return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${hash ? `#${hash}` : ""}`;
}

async function parseResponse(response) {
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorizedResponse();
    }

    const backendMessage = typeof data?.message === "string"
      ? data.message
      : typeof data?.error === "string"
        ? data.error
        : getDefaultErrorMessage();
    const error = new Error(backendMessage);
    error.status = response.status;
    error.errors = data?.errors || null;
    error.data = data;
    error.retryAfter = response.headers.get("Retry-After");
    throw error;
  }

  storeCartSessionId(getCartSessionIdFromResponse(data));
  return data;
}

export async function apiRequest(path, options = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...buildHeaders(),
        ...options.headers,
      },
    });

    return await parseResponse(response);
  } catch (error) {
    if (error?.status || error?.errors || error?.data) {
      throw error;
    }

    throw error || new Error(getConnectionErrorMessage());
  }
}

function collectMessages(value, messages = []) {
  if (!value) {
    return messages;
  }

  if (typeof value === "string") {
    const message = value.trim();

    if (message) {
      messages.push(message);
    }

    return messages;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectMessages(item, messages));
    return messages;
  }

  if (typeof value === "object") {
    if (typeof value.message === "string") {
      collectMessages(value.message, messages);
    }

    Object.values(value).forEach((item) => {
      if (item !== value.message) {
        collectMessages(item, messages);
      }
    });
  }

  return messages;
}

export function normalizeErrors(error) {
  if (error?.message === "Failed to fetch") {
    return [getConnectionErrorMessage()];
  }

  const messages = collectMessages([
    error?.data?.message,
    error?.data?.messages,
    error?.data?.error,
    error?.data?.detail,
    error?.errors,
    error?.message,
  ]);

  const normalizedMessages = [...new Set(messages)].filter(Boolean).map((message) => (
    message === "Request failed." ? getDefaultErrorMessage() : message
  ));

  return normalizedMessages.length > 0 ? normalizedMessages : [getDefaultErrorMessage()];
}

export function getFieldErrors(error, fields = []) {
  if (!error?.errors || typeof error.errors !== "object") {
    return [];
  }

  if (!fields.length) {
    return Object.values(error.errors).flat();
  }

  return fields.flatMap((field) => error.errors?.[field] || []);
}

export function getRetryAfterSeconds(error, fallbackSeconds = DEFAULT_RETRY_AFTER_SECONDS) {
  const candidates = [
    error?.data?.retry_after,
    error?.data?.retryAfter,
    error?.data?.seconds,
    error?.retryAfter,
  ];

  for (const value of candidates) {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.ceil(parsed);
    }
  }

  const message = String(error?.data?.message || error?.message || "");
  const match = message.match(/\b(\d{1,5})\b/);

  if (match) {
    const parsed = Number(match[1]);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallbackSeconds;
}

export function handleApiErrorByStatus(
  error,
  {
    on401,
    on422,
    on429,
    onDefault,
    fallbackRetryAfterSeconds = DEFAULT_RETRY_AFTER_SECONDS,
  } = {},
) {
  if (error?.status === 401 && on401) {
    return on401(error);
  }

  if (error?.status === 422 && on422) {
    return on422(error);
  }

  if (error?.status === 429 && on429) {
    const retryAfter = getRetryAfterSeconds(error, fallbackRetryAfterSeconds);
    return on429(error, retryAfter);
  }

  if (onDefault) {
    return onDefault(error);
  }

  return undefined;
}

export { API_URL };
