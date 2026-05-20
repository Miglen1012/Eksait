const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000")
  .split(",")[0]
  .trim()
  .replace(/\/$/, "") || "http://localhost:8000";
const CART_SESSION_KEY = "excompany_cart_session_id";
const AUTH_TOKEN_KEY = "auth_token";
const DEFAULT_RETRY_AFTER_SECONDS = 60;

function createSessionId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getCartSessionId() {
  const storedSessionId = localStorage.getItem(CART_SESSION_KEY);

  if (storedSessionId) {
    return storedSessionId;
  }

  const sessionId = createSessionId();
  localStorage.setItem(CART_SESSION_KEY, sessionId);
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

    const error = new Error(data?.message || "Request failed.");
    error.status = response.status;
    error.errors = data?.errors || null;
    error.data = data;
    error.retryAfter = response.headers.get("Retry-After");
    throw error;
  }

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

    throw error || new Error("Could not connect to server.");
  }
}

export function normalizeErrors(error) {
  if (error?.message === "Failed to fetch") {
    return ["Could not connect to server. Please try again in a moment."];
  }

  if (!error?.errors) {
    return [error?.message || "Something went wrong. Please try again."];
  }

  return Object.values(error.errors).flat();
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
