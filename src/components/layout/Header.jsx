import { useEffect, useState } from "react";
import { apiRequest, clearAuthToken, getAuthToken } from "../../api/client";
import { fetchEquipmentProducts } from "../../api/equipment";
import { fetchProducts } from "../../api/products";
import { getCartItemCount } from "../../utils/cart";
import { normalizeProducts } from "../../utils/products";
import { getProductUrl, productMatchesSearch } from "../../utils/search";
import logo from "../../assets/es-logo1.png";
import "../../styles/layout.css";

const navItems = [
  { key: "home", label: "Начало", href: "/" },
  { key: "about", label: "За нас", href: "/about" },
  { key: "tools", label: "Инструменти", href: "/category" },
  { key: "equipment", label: "Оборудване", href: "/equipment" },
  { key: "contact", label: "Контакти", href: "/contact" },
];

function getUserFromResponse(data) {
  return data?.user || data?.data || data;
}

function getUserName(user) {
  return user?.name || user?.full_name || user?.email || "";
}

function getInitial(name) {
  return name.trim().charAt(0).toUpperCase() || "П";
}

export default function Header() {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasEquipmentProducts, setHasEquipmentProducts] = useState(null);
  const trimmedSearchQuery = searchQuery.trim();
  const visibleSearchSuggestions = isSearchFocused && trimmedSearchQuery.length >= 2 ? searchSuggestions : [];

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      if (!getAuthToken()) {
        return;
      }

      try {
        const data = await apiRequest("/api/me");
        if (isMounted) {
          setUser(getUserFromResponse(data));
        }
      } catch {
        clearAuthToken();
        if (isMounted) {
          setUser(null);
        }
      }
    }

    async function loadCartCount() {
      try {
        const data = await apiRequest("/api/cart");
        if (isMounted) {
          setCartCount(getCartItemCount(data));
        }
      } catch {
        if (isMounted) {
          setCartCount(0);
        }
      }
    }

    async function loadEquipmentAvailability() {
      try {
        const equipmentProducts = await fetchEquipmentProducts();
        if (isMounted) {
          setHasEquipmentProducts(equipmentProducts.length > 0);
        }
      } catch {
        if (isMounted) {
          setHasEquipmentProducts(null);
        }
      }
    }

    loadUser();
    loadCartCount();
    loadEquipmentAvailability();

    function handleCartChanged() {
      loadCartCount();
    }

    window.addEventListener("cart:changed", handleCartChanged);

    return () => {
      isMounted = false;
      window.removeEventListener("cart:changed", handleCartChanged);
    };
  }, []);

  useEffect(() => {
    if (!isSearchFocused || trimmedSearchQuery.length < 2) {
      return undefined;
    }

    let isCancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        let suggestions = [];

        try {
          const data = await apiRequest(`/api/products/search?q=${encodeURIComponent(trimmedSearchQuery)}&limit=6`);
          suggestions = normalizeProducts(data);
        } catch (error) {
          if (error?.status !== 404) {
            throw error;
          }

          const products = await fetchProducts();
          suggestions = products.filter((product) => productMatchesSearch(product, trimmedSearchQuery)).slice(0, 6);
        }

        if (!isCancelled) {
          setSearchSuggestions(suggestions);
        }
      } catch {
        if (!isCancelled) {
          setSearchSuggestions([]);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [isSearchFocused, trimmedSearchQuery]);

  useEffect(() => {
    function handleNavigation() {
      setIsMobileMenuOpen(false);
    }

    window.addEventListener("app:navigate", handleNavigation);
    window.addEventListener("popstate", handleNavigation);

    return () => {
      window.removeEventListener("app:navigate", handleNavigation);
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  async function handleLogout() {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // Logout should still clear the local session if the backend is unavailable.
    } finally {
      clearAuthToken();
      setUser(null);
      navigateTo("/login");
    }
  }

  function navigateTo(path) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("app:navigate"));
    setIsMobileMenuOpen(false);
  }

  function openOrders() {
    navigateTo("/orders");
  }

  function openCartDrawer() {
    window.dispatchEvent(new Event("cart:open"));
    setIsMobileMenuOpen(false);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();

    if (!trimmedSearchQuery) {
      return;
    }

    navigateTo(`/search?q=${encodeURIComponent(trimmedSearchQuery)}`);
    setIsSearchFocused(false);
  }

  function openProduct(product) {
    navigateTo(getProductUrl(product));
    setSearchQuery("");
    setIsSearchFocused(false);
  }

  function toggleMobileMenu() {
    setIsMobileMenuOpen((current) => !current);
  }

  const userName = getUserName(user);
  const visibleNavItems = hasEquipmentProducts === false
    ? navItems.filter((item) => item.key !== "equipment")
    : navItems;

  return (
    <header className="site-header">
      <div className="layout-container header-bar">
        <a href="/" className="brand-link" aria-label="Excite Company начало">
          <img src={logo} alt="Excite Company" className="brand-logo" decoding="async" />
        </a>

        <div className="header-content">
          <button
            type="button"
            className={isMobileMenuOpen ? "mobile-menu-toggle is-open" : "mobile-menu-toggle"}
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-panel"
            aria-label="Меню"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div id="mobile-navigation-panel" className={isMobileMenuOpen ? "header-mobile-panel is-open" : "header-mobile-panel"}>
            <nav className="header-nav" aria-label="Основна навигация">
              {visibleNavItems.map((item) => (
                <div className="nav-item" key={item.label}>
                  <a href={item.href} className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                    {item.label}
                  </a>
                </div>
              ))}
            </nav>

            <div className="header-tools">
              <form className="header-search" onSubmit={handleSearchSubmit}>
                <input
                  type="search"
                  aria-label="Търси продукти"
                  value={searchQuery}
                  onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                />
                <button type="submit" aria-label="Търси" disabled={!trimmedSearchQuery}>
                  <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m21 21-4.35-4.35" />
                    <circle cx="11" cy="11" r="7" />
                  </svg>
                </button>

                {visibleSearchSuggestions.length > 0 && (
                  <div className="search-suggestions">
                    {visibleSearchSuggestions.map((product) => (
                      <button type="button" onMouseDown={() => openProduct(product)} key={product.id}>
                        {product.image && <img src={product.image} alt="" loading="lazy" decoding="async" />}
                        <span>{product.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </form>

              {user ? (
                <div className="account-menu">
                  <button type="button" className="account-button account-initial" aria-label={`Профил на ${userName}`}>
                    {getInitial(userName)}
                  </button>
                  <div className="account-dropdown">
                    <p>Здравей, {userName}!</p>
                    <button type="button" onClick={openOrders}>Моите поръчки</button>
                    <button type="button" onClick={openCartDrawer}>Количка</button>
                    <button type="button" onClick={handleLogout}>Изход</button>
                  </div>
                </div>
              ) : (
                <a href="/login" className="account-button" aria-label="Профил" onClick={() => setIsMobileMenuOpen(false)}>
                  <svg className="header-icon account-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </a>
              )}

              <button type="button" className="cart-button" onClick={openCartDrawer} aria-label={`Количка с ${cartCount} продукта`}>
                <svg className="header-icon cart-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="21" r="1.5" />
                  <circle cx="19" cy="21" r="1.5" />
                  <path d="M2 3h3l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 1.9-1.4L22 8H6" />
                </svg>
                {cartCount > 0 && <span className="cart-count-badge">{cartCount > 99 ? "99+" : cartCount}</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
