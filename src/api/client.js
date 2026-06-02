const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000")
  .split(",")[0]
  .trim()
  .replace(/\/$/, "") || "http://localhost:8000";
const CART_SESSION_KEY = "cart_session_id";
const LEGACY_CART_SESSION_KEY = "excompany_cart_session_id";
const AUTH_TOKEN_KEY = "auth_token";
const CART_SESSION_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const DEFAULT_RETRY_AFTER_SECONDS = 60;
const DEFAULT_ERROR_MESSAGE = "Възникна проблем. Моля, опитайте отново.";
const CONNECTION_ERROR_MESSAGE = "Няма връзка със сървъра. Моля, опитайте отново след малко.";

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

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

function handleUnauthorizedResponse() {
  if (!getAuthToken()) {
    return;
  }

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
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Cart-Session-Id": getCartSessionId(),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
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
        : DEFAULT_ERROR_MESSAGE;
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

    throw error || new Error(CONNECTION_ERROR_MESSAGE);
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
    return [CONNECTION_ERROR_MESSAGE];
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
    message === "Request failed." ? DEFAULT_ERROR_MESSAGE : message
  ));

  return normalizedMessages.length > 0 ? normalizedMessages : [DEFAULT_ERROR_MESSAGE];
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
