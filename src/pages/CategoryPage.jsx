import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeErrors } from "../api/client";
import { fetchProducts, getCachedProducts, searchProducts } from "../api/products";
import CustomSelect from "../components/form/CustomSelect";
import ProductPagination, { ProductPageSizeSelect } from "../components/products/ProductPagination";
import { categories, getCategoryByName, getCategoryBySlug, getCategoryTokens } from "../data/categories";
import { useLanguage } from "../utils/language";
import { DEFAULT_PRODUCT_PAGE_SIZE, getPageSizeFromSearch } from "../utils/pagination";
import { formatPrice } from "../utils/products";
import { normalizeSearchText } from "../utils/search";
import "../styles/products.css";

const SORT_OPTION_VALUES = [
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
];
const productNameCollator = new Intl.Collator("bg-BG", { sensitivity: "base", numeric: true });
const PRICE_RANGE_STEP = 0.01;
const TOOLS_PARENT_CATEGORY_TOKENS = ["instrumenti", "tools", "werkzeuge"].map((token) => normalizeSearchText(token));
const sortValues = new Set(SORT_OPTION_VALUES);
const TOOLS_CATEGORY_TOKENS = categories.flatMap((category) => getCategoryTokens(category));

function getPageFromSearch() {
  const rawPage = Number.parseInt(new URLSearchParams(window.location.search).get("page") || "1", 10);
  return Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
}

function getSortModeFromSearch() {
  const sortMode = new URLSearchParams(window.location.search).get("sort") || "default";
  return sortValues.has(sortMode) ? sortMode : "default";
}

function getCatalogFiltersFromSearch() {
  const search = new URLSearchParams(window.location.search);

  return {
    minPrice: search.get("min_price") || "",
    maxPrice: search.get("max_price") || "",
    size: search.get("size") || "",
    material: search.get("material") || "",
  };
}

function getSearchTermFromSearch() {
  return new URLSearchParams(window.location.search).get("q") || "";
}

function getCategoryFromPath() {
  const path = window.location.pathname;

  if (!path.startsWith("/category/")) {
    return "";
  }

  const currentSlug = path.replace("/category/", "");
  return getCategoryBySlug(currentSlug)?.label || "";
}

function getProductPath(product) {
  return `/products/${product.slug || product.id}`;
}

function getProductSortPrice(product) {
  if (product.hasVariants && product.variants.length > 0) {
    const variantPrices = product.variants
      .map((variant) => Number(variant.price))
      .filter((price) => Number.isFinite(price) && price > 0);

    if (variantPrices.length > 0) {
      return Math.min(...variantPrices);
    }
  }

  const price = Number(product.price);
  return Number.isFinite(price) ? price : 0;
}

function getProductCategoryTokens(product) {
  return (product?.categories || [])
    .flatMap((category) => [
      category?.name,
      category?.slug,
      category?.label,
      category?.title,
      category?.category_name,
      category?.categoryName,
      category?.category_slug,
      category?.categorySlug,
    ])
    .map((token) => normalizeSearchText(token))
    .filter(Boolean);
}

function productMatchesToolsParentCategory(product) {
  const categoryTokens = getProductCategoryTokens(product);

  if (categoryTokens.some((token) => TOOLS_PARENT_CATEGORY_TOKENS.some((parentToken) => (
    token === parentToken ||
    token.includes(parentToken) ||
    parentToken.includes(token)
  )))) {
    return true;
  }

  return categoryTokens.some((token) => TOOLS_CATEGORY_TOKENS.some((toolToken) => (
    token === toolToken ||
    token.includes(toolToken) ||
    toolToken.includes(token)
  )));
}

function productMatchesCategory(product, selectedCategory) {
  if (!selectedCategory) {
    return true;
  }

  const selectedCategoryData = getCategoryByName(selectedCategory);
  const selectedTokens = [
    selectedCategory,
    ...(selectedCategoryData ? getCategoryTokens(selectedCategoryData) : []),
  ].map(normalizeSearchText).filter(Boolean);

  return (product.categories || []).some((category) => {
    const categoryTokens = [
      category?.name,
      category?.slug,
      category?.label,
      category?.title,
      category?.category_name,
      category?.categoryName,
      category?.category_slug,
      category?.categorySlug,
    ].map(normalizeSearchText).filter(Boolean);

    return categoryTokens.some((categoryToken) => (
      selectedTokens.some((selectedToken) => (
        categoryToken === selectedToken ||
        categoryToken.includes(selectedToken) ||
        selectedToken.includes(categoryToken)
      ))
    ));
  });
}

function productMatchesSearchTerm(product, searchTerm) {
  const normalizedSearchTerm = normalizeSearchText(searchTerm);

  if (!normalizedSearchTerm) {
    return true;
  }

  return String(product.searchText || "").includes(normalizedSearchTerm);
}

function getCatalogPriceBoundProducts(products, categoryName, searchTerm) {
  return products.filter((product) => (
    productMatchesToolsParentCategory(product) &&
    productMatchesCategory(product, categoryName) &&
    productMatchesSearchTerm(product, searchTerm)
  ));
}

function getProductSizes(product) {
  return product.variants
    .map((variant) => String(variant.size || "").trim())
    .filter(Boolean);
}

function getPriceBounds(products) {
  const prices = products
    .map(getProductSortPrice)
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

function clampPrice(value, min, max) {
  const price = Number(value);

  if (!Number.isFinite(price)) {
    return min;
  }

  return Math.min(Math.max(price, min), max);
}

function getRangePercent(value, min, max) {
  if (max <= min) {
    return 0;
  }

  return ((value - min) / (max - min)) * 100;
}

function formatRangeValue(value) {
  return Number(value).toFixed(2);
}

function setSearchParam(search, key, value) {
  const nextValue = String(value || "").trim();

  if (nextValue) {
    search.set(key, nextValue);
  } else {
    search.delete(key);
  }
}

function buildCatalogSearchParams({ filters, productsPerPage, searchTerm, sortMode, page = 1 }) {
  const nextSearch = new URLSearchParams();

  if (page > 1) {
    nextSearch.set("page", String(page));
  }

  if (productsPerPage !== DEFAULT_PRODUCT_PAGE_SIZE) {
    nextSearch.set("per_page", String(productsPerPage));
  }

  setSearchParam(nextSearch, "q", searchTerm);
  setSearchParam(nextSearch, "min_price", filters.minPrice);
  setSearchParam(nextSearch, "max_price", filters.maxPrice);
  setSearchParam(nextSearch, "size", filters.size);
  setSearchParam(nextSearch, "material", filters.material);

  if (sortMode && sortMode !== "default") {
    nextSearch.set("sort", sortMode);
  }

  return nextSearch;
}

function persistCurrentScrollPosition() {
  window.history.replaceState(
    {
      ...(window.history.state || {}),
      __appScrollState: true,
      scrollY: window.scrollY,
    },
    "",
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

function sanitizePriceFilters(filters, priceBounds) {
  if (priceBounds.max <= 0) {
    return {
      ...filters,
      minPrice: "",
      maxPrice: "",
    };
  }

  return {
    ...filters,
    minPrice: filters.minPrice === "" ? "" : formatRangeValue(clampPrice(filters.minPrice, priceBounds.min, priceBounds.max)),
    maxPrice: filters.maxPrice === "" ? "" : formatRangeValue(clampPrice(filters.maxPrice, priceBounds.min, priceBounds.max)),
  };
}

function PriceRangeFilter({ filters, onFilterChange, priceBounds }) {
  const { t } = useLanguage();
  const activeRangeHandleRef = useRef(null);
  const [activeRangeHandle, setActiveRangeHandle] = useState("");
  const minBound = priceBounds.min;
  const maxBound = priceBounds.max;
  const hasRange = maxBound > minBound;
  const selectedMin = clampPrice(filters.minPrice === "" ? minBound : filters.minPrice, minBound, maxBound);
  const selectedMax = clampPrice(filters.maxPrice === "" ? maxBound : filters.maxPrice, minBound, maxBound);
  const safeSelectedMin = Math.min(selectedMin, selectedMax);
  const safeSelectedMax = Math.max(selectedMin, selectedMax);
  const rangeStart = getRangePercent(safeSelectedMin, minBound, maxBound);
  const rangeEnd = getRangePercent(safeSelectedMax, minBound, maxBound);

  function updateMinPrice(value) {
    const nextMin = Math.min(clampPrice(value, minBound, maxBound), safeSelectedMax);
    onFilterChange("minPrice", formatRangeValue(nextMin));
  }

  function updateMaxPrice(value) {
    const nextMax = Math.max(clampPrice(value, minBound, maxBound), safeSelectedMin);
    onFilterChange("maxPrice", formatRangeValue(nextMax));
  }

  function getPointerPrice(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    const safeRatio = Math.min(Math.max(ratio, 0), 1);

    return minBound + safeRatio * (maxBound - minBound);
  }

  function getNearestHandle(value) {
    const minDistance = Math.abs(value - safeSelectedMin);
    const maxDistance = Math.abs(value - safeSelectedMax);

    if (minDistance === maxDistance) {
      return value < (safeSelectedMin + safeSelectedMax) / 2 ? "min" : "max";
    }

    return minDistance < maxDistance ? "min" : "max";
  }

  function updateRangeHandle(handle, value) {
    if (handle === "min") {
      updateMinPrice(value);
      return;
    }

    updateMaxPrice(value);
  }

  function startRangeDrag(event) {
    if (!hasRange || event.button > 0) {
      return;
    }

    event.preventDefault();

    const value = getPointerPrice(event);
    const handle = getNearestHandle(value);

    activeRangeHandleRef.current = handle;
    setActiveRangeHandle(handle);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateRangeHandle(handle, value);
  }

  function moveRangeDrag(event) {
    if (!activeRangeHandleRef.current) {
      return;
    }

    event.preventDefault();
    updateRangeHandle(activeRangeHandleRef.current, getPointerPrice(event));
  }

  function stopRangeDrag(event) {
    if (!activeRangeHandleRef.current) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    activeRangeHandleRef.current = null;
    setActiveRangeHandle("");
  }

  return (
    <fieldset className="products-price-filter products-price-range">
      <div className="products-price-header">
        <legend>{t("price.title")}</legend>
      </div>

      <div
        className={`${hasRange ? "products-range-control" : "products-range-control is-static"}${activeRangeHandle ? " is-dragging" : ""}`}
        style={{
          "--range-start": `${rangeStart}%`,
          "--range-end": `${rangeEnd}%`,
        }}
        onPointerDown={startRangeDrag}
        onPointerMove={moveRangeDrag}
        onPointerUp={stopRangeDrag}
        onPointerCancel={stopRangeDrag}
        onLostPointerCapture={stopRangeDrag}
      >
        {hasRange && (
          <>
            <input
              type="range"
              min={minBound}
              max={maxBound}
              step={PRICE_RANGE_STEP}
              value={safeSelectedMin}
              onChange={(event) => updateMinPrice(event.target.value)}
              aria-label={t("price.min")}
            />
            <input
              type="range"
              min={minBound}
              max={maxBound}
              step={PRICE_RANGE_STEP}
              value={safeSelectedMax}
              onChange={(event) => updateMaxPrice(event.target.value)}
              aria-label={t("price.max")}
            />
          </>
        )}
        <span className="products-range-handle products-range-handle--min" aria-hidden="true" />
        <span className="products-range-handle products-range-handle--max" aria-hidden="true" />
      </div>

      <div className="products-price-values" aria-live="polite">
        <span>{formatPrice(safeSelectedMin)}</span>
        <span>{formatPrice(safeSelectedMax)}</span>
      </div>
    </fieldset>
  );
}

function CatalogFilterPanel({
  filters,
  products,
  searchTerm,
  selectedCategory,
  sortMode,
  onApply,
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const filterMenuRef = useRef(null);
  const [draftSearchTerm, setDraftSearchTerm] = useState(searchTerm);
  const [draftSortMode, setDraftSortMode] = useState(sortMode);
  const [draftFilters, setDraftFilters] = useState(filters);
  const draftPriceBounds = useMemo(
    () => getPriceBounds(getCatalogPriceBoundProducts(products, selectedCategory, draftSearchTerm)),
    [draftSearchTerm, products, selectedCategory],
  );
  const activeCount = [
    searchTerm,
    filters.minPrice,
    filters.maxPrice,
    filters.size,
    filters.material,
    sortMode !== "default" ? sortMode : "",
  ].filter(Boolean).length;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function closeFilters() {
      setIsOpen(false);
    }

    function handleDocumentPointerDown(event) {
      if (filterMenuRef.current?.contains(event.target)) {
        return;
      }

      closeFilters();
    }

    function handleDocumentKeyDown(event) {
      if (event.key === "Escape") {
        closeFilters();
      }
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isOpen]);

  function syncDraftFilters() {
    setDraftSearchTerm(searchTerm);
    setDraftSortMode(sortMode);
    setDraftFilters(filters);
  }

  function toggleFilters() {
    if (!isOpen) {
      syncDraftFilters();
    }

    setIsOpen((current) => !current);
  }

  function updateDraftFilter(name, value) {
    setDraftFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function clearDraftFilters() {
    setDraftSearchTerm("");
    setDraftSortMode("default");
    setDraftFilters({
      minPrice: "",
      maxPrice: "",
      size: "",
      material: "",
    });
  }

  function applyDraftFilters() {
    onApply({
      filters: sanitizePriceFilters(draftFilters, draftPriceBounds),
      searchTerm: draftSearchTerm,
      sortMode: draftSortMode,
    });
    setIsOpen(false);
  }

  const sortOptions = getSortOptions(t);

  return (
    <section className="catalog-filter-menu tools-filter-menu" aria-label={t("common.filters")} ref={filterMenuRef}>
      <button
        type="button"
        className={isOpen ? "catalog-filter-toggle is-open" : "catalog-filter-toggle"}
        onClick={toggleFilters}
        aria-expanded={isOpen}
      >
        <span>{t("common.filters")}</span>
        {activeCount > 0 && <strong>{activeCount}</strong>}
      </button>

      {isOpen && (
        <div className="catalog-filter-panel tools-filter-panel">
          <div className="catalog-filter-column catalog-filter-column--filters">
            <div className="catalog-filter-title">
              <span className="products-kicker">{t("common.filters")}</span>
              <h2>{t("tools.refine")}</h2>
            </div>

            <div className="catalog-filter-fields">
              <label className="products-search-field">
                <span>{t("common.search")}</span>
                <input
                  type="search"
                  value={draftSearchTerm}
                  onChange={(event) => setDraftSearchTerm(event.target.value)}
                  placeholder={t("tools.searchPlaceholder")}
        />
              </label>

              <label className="products-sort-field">
                <span>{t("common.sort")}</span>
                <CustomSelect
                  ariaLabel={t("common.sort")}
                  value={draftSortMode}
                  onChange={setDraftSortMode}
                  options={sortOptions}
                  placeholder={t("common.choose")}
        />
              </label>
            </div>

            <PriceRangeFilter
              filters={draftFilters}
              onFilterChange={updateDraftFilter}
              priceBounds={draftPriceBounds}
            />

            <div className="catalog-filter-actions">
              <button type="button" className="products-clear-filters" onClick={clearDraftFilters}>
                {t("common.clear")}
              </button>
              <button type="button" className="catalog-filter-search" onClick={applyDraftFilters}>
                {t("common.search")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function getSortOptions(t) {
  return [
    { value: "name-asc", label: t("sort.nameAsc") },
    { value: "name-desc", label: t("sort.nameDesc") },
    { value: "price-asc", label: t("sort.priceAsc") },
    { value: "price-desc", label: t("sort.priceDesc") },
  ];
}

function getCategoryDisplayName(categoryName, t) {
  const category = getCategoryByName(categoryName);

  return category ? t(`category.${category.slug}`) : categoryName;
}

function SidebarFilters({
  filters,
  priceBounds,
  searchTerm,
  sizeOptions,
  sortMode,
  onClearFilters,
  onFilterChange,
  onSearchChange,
  onSortChange,
}) {
  const { t } = useLanguage();
  const hasActiveFilters = Boolean(filters.minPrice || filters.maxPrice || filters.size || filters.material || searchTerm);
  const sortOptions = getSortOptions(t);

  return (
    <section className="sidebar-filter-panel" aria-label={t("common.filters")}>
      <div>
        <span className="products-kicker">{t("common.filters")}</span>
      </div>

      <label className="products-search-field">
        <span>{t("common.search")}</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("tools.searchPlaceholder")}
        />
      </label>

      <label className="products-sort-field">
        <span>{t("common.sort")}</span>
        <CustomSelect
          ariaLabel={t("common.sort")}
          value={sortMode}
          onChange={onSortChange}
          options={sortOptions}
          placeholder={t("common.choose")}
        />
      </label>

      <PriceRangeFilter
        filters={filters}
        onFilterChange={onFilterChange}
        priceBounds={priceBounds}
      />

      <fieldset className="products-chip-filter">
        <legend>{t("product.size")}</legend>
        <div className="products-filter-chips">
          <button
            type="button"
            className={filters.size ? "" : "is-active"}
            onClick={() => onFilterChange("size", "")}
          >
            {t("common.all")}
          </button>
          {sizeOptions.length > 0 ? (
            sizeOptions.map((size) => (
              <button
                type="button"
                className={filters.size === size ? "is-active" : ""}
                onClick={() => onFilterChange("size", size)}
                key={size}
              >
                {size}
              </button>
            ))
          ) : (
            <span className="products-filter-empty">{t("common.noVariants")}</span>
          )}
        </div>
      </fieldset>

      {hasActiveFilters && (
        <button type="button" className="products-clear-filters" onClick={onClearFilters}>
          {t("common.clearFilters")}
        </button>
      )}
    </section>
  );
}

// eslint-disable-next-line no-unused-vars
function CategorySidebar({
  filters,
  priceBounds,
  searchTerm,
  selectedCategory,
  sizeOptions,
  sortMode,
  onClearFilters,
  onFilterChange,
  onSearchChange,
  onSortChange,
  onSelectCategory,
}) {
  const { t } = useLanguage();

  return (
    <aside className="products-sidebar">
      <SidebarFilters
        filters={filters}
        priceBounds={priceBounds}
        searchTerm={searchTerm}
        sizeOptions={sizeOptions}
        sortMode={sortMode}
        onClearFilters={onClearFilters}
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
      />

      <section className="category-panel" aria-label={t("common.categories")}>
        <div>
          <span className="products-kicker">{t("common.categories")}</span>
        </div>

        <div className="category-links">
          <button
            type="button"
            className={selectedCategory ? "" : "is-active"}
            onClick={() => onSelectCategory("")}
          >
            {t("common.allProducts")}
          </button>
          {categories.map((category) => (
            <button
              type="button"
              className={category.label === selectedCategory ? "is-active" : ""}
              onClick={() => onSelectCategory(category.label)}
              key={category.slug}
            >
              {t(`category.${category.slug}`)}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default function CategoryPage({ slug }) {
  const { language, t } = useLanguage();
  const initialCategory = getCategoryBySlug(slug)?.label || "";
  const [products, setProducts] = useState(() => getCachedProducts(language) || []);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState(getSearchTermFromSearch);
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sortMode, setSortMode] = useState(getSortModeFromSearch);
  const [productsPerPage, setProductsPerPage] = useState(getPageSizeFromSearch);
  const [filters, setFilters] = useState(getCatalogFiltersFromSearch);
  const [currentPage, setCurrentPage] = useState(getPageFromSearch);
  const [loading, setLoading] = useState(() => !getCachedProducts(language));
  const [messages, setMessages] = useState([]);
  const productsMainRef = useRef(null);
  const shouldScrollOnPageChangeRef = useRef(false);
  const historyEntryScrollPersistedRef = useRef(false);

  async function refreshProducts() {
    setProducts(await fetchProducts({ language }));
  }

  const baseFilteredProducts = useMemo(() => {
    const searchScopedProducts = searchTerm ? (searchResults || []) : products;

    return searchScopedProducts.filter((product) => {
      const matchesToolsParentCategory = productMatchesToolsParentCategory(product);
      const matchesCategory = productMatchesCategory(product, selectedCategory);
      return matchesToolsParentCategory && matchesCategory;
    });
  }, [products, searchResults, searchTerm, selectedCategory]);

  const filteredProducts = useMemo(() => {
    const minPrice = filters.minPrice === "" ? null : Number(filters.minPrice);
    const maxPrice = filters.maxPrice === "" ? null : Number(filters.maxPrice);

    const nextProducts = baseFilteredProducts.filter((product) => {
      const price = getProductSortPrice(product);
      const matchesMinPrice = minPrice === null || !Number.isFinite(minPrice) || price >= minPrice;
      const matchesMaxPrice = maxPrice === null || !Number.isFinite(maxPrice) || price <= maxPrice;
      const matchesSize = filters.size ? getProductSizes(product).includes(filters.size) : true;
      const matchesMaterial = filters.material ? product.material === filters.material : true;

      return matchesMinPrice && matchesMaxPrice && matchesSize && matchesMaterial;
    });

    return [...nextProducts].sort((firstProduct, secondProduct) => {
      if (sortMode === "name-asc") {
        return productNameCollator.compare(firstProduct.name, secondProduct.name);
      }

      if (sortMode === "name-desc") {
        return productNameCollator.compare(secondProduct.name, firstProduct.name);
      }

      if (sortMode === "price-asc") {
        return getProductSortPrice(firstProduct) - getProductSortPrice(secondProduct);
      }

      if (sortMode === "price-desc") {
        return getProductSortPrice(secondProduct) - getProductSortPrice(firstProduct);
      }

      return 0;
    });
  }, [baseFilteredProducts, filters, sortMode]);

  const totalProductsCount = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const visibleCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (visibleCurrentPage - 1) * productsPerPage;
    return filteredProducts.slice(startIndex, startIndex + productsPerPage);
  }, [filteredProducts, productsPerPage, visibleCurrentPage]);

  useEffect(() => {
    if (loading || !productsMainRef.current || !shouldScrollOnPageChangeRef.current) {
      return;
    }

    shouldScrollOnPageChangeRef.current = false;
    const top = window.scrollY + productsMainRef.current.getBoundingClientRect().top - 118;
    window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "auto" });
  }, [visibleCurrentPage, loading]);

  useEffect(() => {
    function handleHistoryChange(event) {
      if (event.type === "popstate") {
        shouldScrollOnPageChangeRef.current = false;
      }

      setSelectedCategory(getCategoryFromPath());
      setSearchTerm(getSearchTermFromSearch());
      setSortMode(getSortModeFromSearch());
      setFilters(getCatalogFiltersFromSearch());
      setCurrentPage(getPageFromSearch());
      setProductsPerPage(getPageSizeFromSearch());
    }

    window.addEventListener("popstate", handleHistoryChange);
    window.addEventListener("app:navigate", handleHistoryChange);

    return () => {
      window.removeEventListener("popstate", handleHistoryChange);
      window.removeEventListener("app:navigate", handleHistoryChange);
    };
  }, []);

  useEffect(() => {
    const nextSearch = buildCatalogSearchParams({
      filters,
      productsPerPage,
      searchTerm,
      sortMode,
      page: visibleCurrentPage,
    });

    const nextSearchText = nextSearch.toString();
    const nextUrl = `${window.location.pathname}${nextSearchText ? `?${nextSearchText}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl === currentUrl) {
      historyEntryScrollPersistedRef.current = false;
      return;
    }

    if (!historyEntryScrollPersistedRef.current) {
      persistCurrentScrollPosition();
    }

    historyEntryScrollPersistedRef.current = false;
    window.history.pushState(
      {
        __appScrollState: true,
        scrollY: window.scrollY,
      },
      "",
      nextUrl,
    );
    window.dispatchEvent(new Event("app:navigate"));
  }, [filters, productsPerPage, searchTerm, sortMode, visibleCurrentPage]);

  useEffect(() => {
    async function loadProducts() {
      if (!getCachedProducts(language)) {
        setLoading(true);
      }
      setMessages([]);

      try {
        await refreshProducts();
      } catch (error) {
        setMessages(normalizeErrors(error));
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [language]);

  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim();
    let isCancelled = false;

    if (!trimmedSearchTerm) {
      window.queueMicrotask(() => {
        if (!isCancelled) {
          setSearchResults(null);
          setSearchLoading(false);
        }
      });

      return () => {
        isCancelled = true;
      };
    }

    window.queueMicrotask(() => {
      if (!isCancelled) {
        setSearchLoading(true);
      }
    });

    async function loadSearchResults() {
      try {
        const nextSearchResults = await searchProducts(trimmedSearchTerm, {
          language,
          limit: Math.max(96, productsPerPage * 4),
        });

        if (!isCancelled) {
          setSearchResults(nextSearchResults);
        }
      } catch (error) {
        if (!isCancelled) {
          setMessages(normalizeErrors(error));
          setSearchResults([]);
        }
      } finally {
        if (!isCancelled) {
          setSearchLoading(false);
        }
      }
    }

    loadSearchResults();

    return () => {
      isCancelled = true;
    };
  }, [language, productsPerPage, searchTerm]);

  function handleProductsPerPageChange(value) {
    persistCurrentScrollPosition();
    historyEntryScrollPersistedRef.current = true;
    shouldScrollOnPageChangeRef.current = true;
    setProductsPerPage(value);
    setCurrentPage(1);
  }

  function handlePageChange(page) {
    persistCurrentScrollPosition();
    historyEntryScrollPersistedRef.current = true;
    shouldScrollOnPageChangeRef.current = true;
    setCurrentPage(page);
  }

  function handleCatalogFilterApply({ filters: nextFilters, searchTerm: nextSearchTerm, sortMode: nextSortMode }) {
    const category = getCategoryByName(selectedCategory);
    shouldScrollOnPageChangeRef.current = true;
    setSearchTerm(nextSearchTerm);
    setSortMode(nextSortMode);
    setFilters(nextFilters);
    setCurrentPage(1);

    const nextPath = category ? `/category/${category.slug}` : "/category";
    const nextSearch = buildCatalogSearchParams({
      filters: nextFilters,
      productsPerPage,
      searchTerm: nextSearchTerm,
      sortMode: nextSortMode,
      page: 1,
    });

    const nextSearchText = nextSearch.toString();
    const nextUrl = `${nextPath}${nextSearchText ? `?${nextSearchText}` : ""}`;

    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      persistCurrentScrollPosition();
      window.history.pushState(
        {
          __appScrollState: true,
          scrollY: window.scrollY,
        },
        "",
        nextUrl,
      );
      window.dispatchEvent(new Event("app:navigate"));
    }
  }

  return (
    <main className="products-page">
      <div className="products-layout">
        <section className="products-shell">
          <div className="products-header">
            <div className="products-heading">
              <span className="products-kicker">{t("tools.title")}</span>
              <h1>{selectedCategory ? getCategoryDisplayName(selectedCategory, t) : t("common.allProducts")}</h1>
            </div>
            <div className="products-filter-footer products-heading-meta">
              <div className="products-filter-meta">
                <strong>{totalProductsCount}</strong>
                <span>{totalProductsCount === 1 ? t("tools.foundOne") : t("tools.foundMany")}</span>
              </div>
              <ProductPageSizeSelect
                pageSize={productsPerPage}
                onPageSizeChange={handleProductsPerPageChange}
              />
            </div>
            <CatalogFilterPanel
              filters={filters}
              products={products}
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              sortMode={sortMode}
              onApply={handleCatalogFilterApply}
            />
          </div>

          <div className="products-main" ref={productsMainRef}>
            {messages.length > 0 && (
              <div className="products-alert">
                {messages.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )}

            {loading || searchLoading ? (
              <div className="products-empty">{t("common.loading")}</div>
            ) : totalProductsCount === 0 ? (
              <div className="products-empty">{t("tools.empty")}</div>
            ) : (
              <>
                <div className="products-grid">
                  {paginatedProducts.map((product) => {
                  const categoryNames = product.categoryNames || product.categories.map((category) => category.name).join(", ");
                  const productPath = getProductPath(product);
                  const plainDescription = product.plainDescription || "";

                  return (
                    <article className="product-card-item" key={product.id}>
                      <a className="product-card-media" href={productPath}>
                        <span className="product-card-media-frame">
                          {product.image ? (
                            <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
                          ) : (
                            <span className="product-card-media-placeholder">
                              {selectedCategory ? getCategoryDisplayName(selectedCategory, t) : t("common.product")}
                            </span>
                          )}
                        </span>
                      </a>
                      <div className="product-card-content">
                        {categoryNames && <span>{categoryNames}</span>}
                        <h2><a href={productPath}>{product.name}</a></h2>
                        {plainDescription && <p>{plainDescription}</p>}

                        <div className="product-card-footer">
                          {product.hasVariants ? (
                            <span className="product-card-footer-info product-card-footer-info--variant">{t("common.viewDetailsPrompt")}</span>
                          ) : (
                            <strong>{formatPrice(product.price)}</strong>
                          )}

                          <a href={productPath} className="product-card-action">{t("common.view")}</a>
                        </div>
                      </div>
                    </article>
                  );
                  })}
                </div>

                <ProductPagination
                  currentPage={visibleCurrentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
