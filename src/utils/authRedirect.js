const AUTH_RETURN_PATH_KEY = "auth_return_path";
const AUTH_ROUTE_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];

function normalizePath(value) {
  const path = String(value || "").trim();

  if (!path.startsWith("/") || path.startsWith("//")) {
    return "";
  }

  return path;
}

export function isAuthRoute(pathname = window.location.pathname) {
  return AUTH_ROUTE_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function getCurrentAppPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function storeAuthReturnPath(path = getCurrentAppPath()) {
  const normalizedPath = normalizePath(path);

  if (!normalizedPath || isAuthRoute(window.location.pathname)) {
    return;
  }

  sessionStorage.setItem(AUTH_RETURN_PATH_KEY, normalizedPath);
}

export function clearAuthReturnPath() {
  sessionStorage.removeItem(AUTH_RETURN_PATH_KEY);
}

export function consumeAuthReturnPath(fallbackPath = "/") {
  const storedPath = normalizePath(sessionStorage.getItem(AUTH_RETURN_PATH_KEY));
  clearAuthReturnPath();
  return storedPath || fallbackPath;
}

export function navigateToAppPath(path) {
  const nextPath = normalizePath(path) || "/";

  window.history.pushState({ __appScrollState: true, scrollY: 0 }, "", nextPath);
  window.dispatchEvent(new Event("app:navigate"));
}
