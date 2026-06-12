import { useEffect, useRef, useState } from "react";
import { apiRequest, clearAuthToken, getAuthToken } from "../../api/client";
import { fetchEquipmentProducts } from "../../api/equipment";
import { searchProducts } from "../../api/products";
import { categories } from "../../data/categories";
import { getCartItemCount } from "../../utils/cart";
import { applyDocumentLanguage, LANGUAGE_OPTIONS, storeLanguage, useLanguage } from "../../utils/language";
import { formatPrice } from "../../utils/products";
import { getProductUrl } from "../../utils/search";
import logo from "../../assets/es-logo1.png";
import "../../styles/layout.css";

const navItems = [
  { key: "home", labelKey: "nav.home", href: "/" },
  { key: "about", labelKey: "nav.about", href: "/about" },
  { key: "tools", labelKey: "nav.tools", href: "/category" },
  { key: "equipment", labelKey: "nav.equipment", href: "/equipment" },
  { key: "contact", labelKey: "nav.contact", href: "/contact" },
];

function getUserFromResponse(data) {
  return data?.user || data?.data || data;
}

function getUserName(user) {
  return user?.name || user?.full_name || user?.email || "";
}

function getInitial(name) {
  return name.trim().charAt(0).toUpperCase() || "P";
}

function LanguageSwitcher({ activeLanguage, onChange, t }) {
  return (
    <div className="language-switcher" aria-label={t("header.switchLanguage")}>
      {LANGUAGE_OPTIONS.map((language) => (
        <button
          type="button"
          className={activeLanguage === language.code ? "language-switch-button is-active" : "language-switch-button"}
          onClick={() => onChange(language.code)}
          aria-label={t("header.changeLanguageTo", { language: language.label })}
          aria-pressed={activeLanguage === language.code}
          title={language.label}
          key={language.code}
        >
          <span className={`language-flag language-flag--${language.code}`} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function ToolsNavItem({ currentPath, isOpen, isSuppressed, menuRef, onClearSuppression, onClose, onNavigate, onToggle, t }) {
  const currentCategorySlug = currentPath.startsWith("/category/") ? currentPath.replace("/category/", "") : "";
  const isAllProductsActive = currentPath === "/category" || currentPath === "/categories" || currentPath === "/products";
  const className = [
    "nav-item",
    "nav-item--tools",
    isOpen ? "is-open" : "",
    isSuppressed ? "is-click-closed" : "",
  ].filter(Boolean).join(" ");

  function handleToolsClick(event) {
    event.preventDefault();
    onToggle();
  }

  function handleMouseLeave() {
    onClearSuppression();
    onClose();
  }

  return (
    <div className={className} onMouseLeave={handleMouseLeave} ref={menuRef}>
      <a
        href="/category"
        className="nav-link has-dropdown"
        onClick={handleToolsClick}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {t("nav.tools")}
      </a>

      <div className="dropdown-menu tools-dropdown" role="menu" aria-label={t("common.categories")}>
        <div className="tools-dropdown-heading">
          <span>{t("common.categories")}</span>
          <a
            href="/category"
            className={isAllProductsActive ? "tools-dropdown-view-all is-active" : "tools-dropdown-view-all"}
            onClick={onNavigate}
            role="menuitem"
          >
            {t("common.viewAllProducts")}
          </a>
        </div>

        <div className="tools-dropdown-list">
          {categories.map((category) => (
            <a
              href={`/category/${category.slug}`}
              className={category.slug === currentCategorySlug ? "is-active" : ""}
              onClick={onNavigate}
              role="menuitem"
              key={category.slug}
            >
              {t(`category.${category.slug}`)}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const { language: activeLanguage, t } = useLanguage();
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchSuggestionsKey, setSearchSuggestionsKey] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isToolsMenuSuppressed, setIsToolsMenuSuppressed] = useState(false);
  const [hasEquipmentProducts, setHasEquipmentProducts] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const toolsMenuRef = useRef(null);
  const trimmedSearchQuery = searchQuery.trim();
  const shouldShowSearchSuggestions = isSearchFocused && trimmedSearchQuery.length >= 2;
  const currentSearchSuggestionsKey = `${activeLanguage}:${trimmedSearchQuery}`;
  const isSearching = shouldShowSearchSuggestions && searchSuggestionsKey !== currentSearchSuggestionsKey;
  const visibleSearchSuggestions = isSearching ? [] : searchSuggestions;

  useEffect(() => {
    applyDocumentLanguage(activeLanguage);
  }, [activeLanguage]);

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
        const equipmentProducts = await fetchEquipmentProducts({ force: true, language: activeLanguage });
        if (isMounted) {
          setHasEquipmentProducts(equipmentProducts.length > 0);
        }
      } catch {
        if (isMounted) {
          setHasEquipmentProducts(false);
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
  }, [activeLanguage]);

  useEffect(() => {
    if (!shouldShowSearchSuggestions) {
      return undefined;
    }

    let isCancelled = false;
    const timer = window.setTimeout(async () => {
      let nextSuggestions;

      try {
        nextSuggestions = await searchProducts(trimmedSearchQuery, { language: activeLanguage, limit: 6 });
      } catch {
        nextSuggestions = [];
      }

      if (!isCancelled) {
        setSearchSuggestions(nextSuggestions);
        setSearchSuggestionsKey(currentSearchSuggestionsKey);
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeLanguage, currentSearchSuggestionsKey, shouldShowSearchSuggestions, trimmedSearchQuery]);

  useEffect(() => {
    function handleNavigation(event) {
      setCurrentPath(window.location.pathname);
      setIsMobileMenuOpen(false);
      setIsToolsMenuOpen(false);

      if (event.type === "popstate") {
        setIsToolsMenuSuppressed(false);
      }
    }

    window.addEventListener("app:navigate", handleNavigation);
    window.addEventListener("popstate", handleNavigation);

    return () => {
      window.removeEventListener("app:navigate", handleNavigation);
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  useEffect(() => {
    if (!isToolsMenuOpen) {
      return undefined;
    }

    function closeToolsMenu() {
      setIsToolsMenuOpen(false);
      setIsToolsMenuSuppressed(false);
    }

    function handleDocumentPointerDown(event) {
      if (toolsMenuRef.current?.contains(event.target)) {
        return;
      }

      closeToolsMenu();
    }

    function handleDocumentKeyDown(event) {
      if (event.key === "Escape") {
        closeToolsMenu();
      }
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isToolsMenuOpen]);

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
    setIsToolsMenuOpen(false);
    setIsToolsMenuSuppressed(false);
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
    setIsMobileMenuOpen((current) => {
      if (current) {
        setIsToolsMenuOpen(false);
        setIsToolsMenuSuppressed(false);
      }

      return !current;
    });
  }

  function handleLanguageChange(language) {
    storeLanguage(language);
  }

  const userName = getUserName(user);
  const visibleNavItems = hasEquipmentProducts
    ? navItems
    : navItems.filter((item) => item.key !== "equipment");

  return (
    <header className="site-header">
      <div className="layout-container header-bar">
        <a href="/" className="brand-link" aria-label={t("header.brandAria")}>
          <img src={logo} alt="Excite Company" className="brand-logo" decoding="async" />
        </a>

        <div className="header-content">
          <button
            type="button"
            className={isMobileMenuOpen ? "mobile-menu-toggle is-open" : "mobile-menu-toggle"}
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-panel"
            aria-label={t("header.menu")}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div id="mobile-navigation-panel" className={isMobileMenuOpen ? "header-mobile-panel is-open" : "header-mobile-panel"}>
            <nav className="header-nav" aria-label={t("footer.nav")}>
              {visibleNavItems.map((item) => (
                item.key === "tools" ? (
                  <ToolsNavItem
                    currentPath={currentPath}
                    isOpen={isToolsMenuOpen}
                    isSuppressed={isToolsMenuSuppressed}
                    menuRef={toolsMenuRef}
                    onClearSuppression={() => setIsToolsMenuSuppressed(false)}
                    onClose={() => {
                      setIsToolsMenuOpen(false);
                      setIsToolsMenuSuppressed(false);
                    }}
                    onNavigate={() => {
                      setIsMobileMenuOpen(false);
                      setIsToolsMenuOpen(false);
                      setIsToolsMenuSuppressed(true);
                    }}
                    onToggle={() => {
                      setIsToolsMenuSuppressed(isToolsMenuOpen);
                      setIsToolsMenuOpen(!isToolsMenuOpen);
                    }}
                    t={t}
                    key={item.key}
                  />
                ) : (
                  <div className="nav-item" key={item.key}>
                    <a href={item.href} className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                      {t(item.labelKey)}
                    </a>
                  </div>
                )
              ))}
            </nav>

            <div className="header-tools">
              <form className="header-search" onSubmit={handleSearchSubmit}>
                <input
                  type="search"
                  aria-label={t("header.searchProducts")}
                  value={searchQuery}
                  onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                />
                <button type="submit" aria-label={t("common.search")} disabled={!trimmedSearchQuery}>
                  <svg className="header-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m21 21-4.35-4.35" />
                    <circle cx="11" cy="11" r="7" />
                  </svg>
                </button>

                {shouldShowSearchSuggestions && (
                  <div className="search-suggestions">
                    {isSearching ? (
                      <p className="search-suggestions-empty">{t("common.searching")}</p>
                    ) : visibleSearchSuggestions.length > 0 ? (
                      visibleSearchSuggestions.map((product) => (
                        <button type="button" className="search-suggestion-item" onMouseDown={() => openProduct(product)} key={product.id}>
                          <span className="search-suggestion-thumb">
                            {product.image ? (
                              <img src={product.image} alt="" loading="lazy" decoding="async" />
                            ) : (
                              <span>{product.name?.charAt(0)?.toUpperCase() || "P"}</span>
                            )}
                          </span>
                          <span className="search-suggestion-content">
                            <span className="search-suggestion-name">{product.name}</span>
                            <span className="search-suggestion-meta">{product.categoryNames || t("common.product")}</span>
                          </span>
                          <strong className="search-suggestion-price">{formatPrice(product.price)}</strong>
                        </button>
                      ))
                    ) : (
                      <p className="search-suggestions-empty">{t("common.noResults")}</p>
                    )}
                  </div>
                )}
              </form>

              <LanguageSwitcher activeLanguage={activeLanguage} onChange={handleLanguageChange} t={t} />

              {user ? (
                <div className="account-menu">
                  <button type="button" className="account-button account-initial" aria-label={t("header.profileOf", { name: userName })}>
                    {getInitial(userName)}
                  </button>
                  <div className="account-dropdown">
                    <p>{t("header.hello", { name: userName })}</p>
                    <button type="button" onClick={openOrders}>{t("header.orders")}</button>
                    <button type="button" onClick={openCartDrawer}>{t("common.cart")}</button>
                    <button type="button" onClick={handleLogout}>{t("header.logout")}</button>
                  </div>
                </div>
              ) : (
                <a href="/login" className="account-button" aria-label={t("common.profile")} onClick={() => setIsMobileMenuOpen(false)}>
                  <svg className="header-icon account-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </a>
              )}

              <button type="button" className="cart-button" onClick={openCartDrawer} aria-label={t("header.cartWithCount", { count: cartCount })}>
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
