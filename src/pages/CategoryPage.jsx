import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeErrors } from "../api/client";
import { fetchProducts, getCachedProducts, searchProducts } from "../api/products";
import CustomSelect from "../components/form/CustomSelect";
import ProductPagination, { ProductPageSizeSelect } from "../components/products/ProductPagination";
import { categories, getCategoryByName, getCategoryBySlug } from "../data/categories";
import { DEFAULT_PRODUCT_PAGE_SIZE, getPageSizeFromSearch } from "../utils/pagination";
import { formatPrice, stripHtml } from "../utils/products";
import { normalizeSearchText } from "../utils/search";
import "../styles/products.css";

const sortOptions = [
  { value: "default", label: "Подредба" },
  { value: "name", label: "По име" },
  { value: "price-asc", label: "Цена възходящо" },
  { value: "price-desc", label: "Цена низходящо" },
];
const productNameCollator = new Intl.Collator("bg-BG", { sensitivity: "base", numeric: true });
const PRICE_RANGE_STEP = 0.01;
const TOOLS_PARENT_CATEGORY_TOKENS = ["instrumenti", "tools"];
const TOOLS_CATEGORY_TOKENS = categories
  .flatMap((category) => [category.label, category.slug])
  .map((token) => normalizeSearchText(token))
  .filter(Boolean);

function getPageFromSearch() {
  const rawPage = Number.parseInt(new URLSearchParams(window.location.search).get("page") || "1", 10);
  return Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
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
    selectedCategoryData?.slug,
  ].map(normalizeSearchText).filter(Boolean);

  return (product.categories || []).some((category) => {
    const categoryTokens = [
      category?.name,
      category?.slug,
      category?.label,
      category?.title,
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

function PriceRangeFilter({ filters, onFilterChange, priceBounds }) {
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
        <legend>Цена</legend>
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
              aria-label="Минимална цена"
            />
            <input
              type="range"
              min={minBound}
              max={maxBound}
              step={PRICE_RANGE_STEP}
              value={safeSelectedMax}
              onChange={(event) => updateMaxPrice(event.target.value)}
              aria-label="Максимална цена"
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
  priceBounds,
  searchTerm,
  selectedCategory,
  sortMode,
  onApply,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState(selectedCategory);
  const [draftSearchTerm, setDraftSearchTerm] = useState(searchTerm);
  const [draftSortMode, setDraftSortMode] = useState(sortMode);
  const [draftFilters, setDraftFilters] = useState(filters);
  const activeCount = [
    selectedCategory,
    searchTerm,
    filters.minPrice,
    filters.maxPrice,
    filters.size,
    filters.material,
    sortMode !== "default" ? sortMode : "",
  ].filter(Boolean).length;

  function syncDraftFilters() {
    setDraftCategory(selectedCategory);
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
    setDraftCategory("");
    setDraftSearchTerm("");
    setDraftSortMode("default");
    setDraftFilters({
      minPrice: "",
      maxPrice: "",
      size: "",
      material: "",
    });
  }

  function selectDraftCategory(categoryName) {
    setDraftCategory(categoryName);
    onApply({
      categoryName,
      filters: draftFilters,
      searchTerm: draftSearchTerm,
      sortMode: draftSortMode,
    });
  }

  function applyDraftFilters() {
    onApply({
      categoryName: draftCategory,
      filters: draftFilters,
      searchTerm: draftSearchTerm,
      sortMode: draftSortMode,
    });
    setIsOpen(false);
  }

  return (
    <section className="catalog-filter-menu" aria-label="Филтри и категории">
      <button
        type="button"
        className={isOpen ? "catalog-filter-toggle is-open" : "catalog-filter-toggle"}
        onClick={toggleFilters}
        aria-expanded={isOpen}
      >
        <span>Филтри и категории</span>
        {activeCount > 0 && <strong>{activeCount}</strong>}
      </button>

      {isOpen && (
        <div className="catalog-filter-panel">
          <div className="catalog-filter-column catalog-filter-column--categories">
            <div className="catalog-filter-title">
              <span className="products-kicker">Категории</span>
              <h2>Избери категория</h2>
            </div>

            <div className="catalog-category-grid">
              <button
                type="button"
                className={draftCategory ? "" : "is-active"}
                onClick={() => selectDraftCategory("")}
              >
                Всички продукти
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  className={category.label === draftCategory ? "is-active" : ""}
                  onClick={() => selectDraftCategory(category.label)}
                  key={category.slug}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-filter-column catalog-filter-column--filters">
            <div className="catalog-filter-title">
              <span className="products-kicker">Филтри</span>
              <h2>Уточни резултатите</h2>
            </div>

            <div className="catalog-filter-fields">
              <label className="products-search-field">
                <span>Търсене</span>
                <input
                  type="search"
                  value={draftSearchTerm}
                  onChange={(event) => setDraftSearchTerm(event.target.value)}
                  placeholder="Търси по име, описание или категория"
        />
              </label>

              <label className="products-sort-field">
                <span>Сортиране</span>
                <CustomSelect
                  ariaLabel="Сортиране"
                  value={draftSortMode}
                  onChange={setDraftSortMode}
                  options={sortOptions}
                  placeholder="Подредба"
        />
              </label>
            </div>

            <PriceRangeFilter
              filters={draftFilters}
              onFilterChange={updateDraftFilter}
              priceBounds={priceBounds}
            />

            <div className="catalog-filter-actions">
              <button type="button" className="products-clear-filters" onClick={clearDraftFilters}>
                Изчисти
              </button>
              <button type="button" className="catalog-filter-search" onClick={applyDraftFilters}>
                Търсене
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
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
  const hasActiveFilters = Boolean(filters.minPrice || filters.maxPrice || filters.size || filters.material || searchTerm);

  return (
    <section className="sidebar-filter-panel" aria-label="Филтри">
      <div>
        <span className="products-kicker">Филтри</span>
      </div>

      <label className="products-search-field">
        <span>Търсене</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Търси по име, описание или категория"
        />
      </label>

      <label className="products-sort-field">
        <span>Сортиране</span>
        <CustomSelect
          ariaLabel="Сортиране"
          value={sortMode}
          onChange={onSortChange}
          options={sortOptions}
          placeholder="Подредба"
        />
      </label>

      <PriceRangeFilter
        filters={filters}
        onFilterChange={onFilterChange}
        priceBounds={priceBounds}
      />

      <fieldset className="products-chip-filter">
        <legend>Тип/Размер</legend>
        <div className="products-filter-chips">
          <button
            type="button"
            className={filters.size ? "" : "is-active"}
            onClick={() => onFilterChange("size", "")}
          >
            Всички
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
            <span className="products-filter-empty">Няма варианти</span>
          )}
        </div>
      </fieldset>

      {hasActiveFilters && (
        <button type="button" className="products-clear-filters" onClick={onClearFilters}>
          Изчисти филтрите
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

      <section className="category-panel" aria-label="Категории">
        <div>
          <span className="products-kicker">Категории</span>
        </div>

        <div className="category-links">
          <button
            type="button"
            className={selectedCategory ? "" : "is-active"}
            onClick={() => onSelectCategory("")}
          >
            Всички продукти
          </button>
          {categories.map((category) => (
            <button
              type="button"
              className={category.label === selectedCategory ? "is-active" : ""}
              onClick={() => onSelectCategory(category.label)}
              key={category.slug}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default function CategoryPage({ slug }) {
  const initialCategory = getCategoryBySlug(slug)?.label || "";
  const [products, setProducts] = useState(() => getCachedProducts() || []);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sortMode, setSortMode] = useState("default");
  const [productsPerPage, setProductsPerPage] = useState(getPageSizeFromSearch);
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    size: "",
    material: "",
  });
  const [currentPage, setCurrentPage] = useState(getPageFromSearch);
  const [loading, setLoading] = useState(() => !getCachedProducts());
  const [messages, setMessages] = useState([]);
  const productsMainRef = useRef(null);

  async function refreshProducts() {
    setProducts(await fetchProducts());
  }

  const baseFilteredProducts = useMemo(() => {
    const searchScopedProducts = searchTerm ? (searchResults || []) : products;

    return searchScopedProducts.filter((product) => {
      const matchesToolsParentCategory = productMatchesToolsParentCategory(product);
      const matchesCategory = productMatchesCategory(product, selectedCategory);
      return matchesToolsParentCategory && matchesCategory;
    });
  }, [products, searchResults, searchTerm, selectedCategory]);

  const priceBounds = useMemo(
    () => getPriceBounds(baseFilteredProducts),
    [baseFilteredProducts],
  );

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
      if (sortMode === "name") {
        return productNameCollator.compare(firstProduct.name, secondProduct.name);
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
    if (loading || !productsMainRef.current) {
      return;
    }

    const top = window.scrollY + productsMainRef.current.getBoundingClientRect().top - 118;
    window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "auto" });
  }, [visibleCurrentPage, loading]);

  useEffect(() => {
    function handleHistoryChange() {
      setSelectedCategory(getCategoryFromPath());
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
    const nextSearch = new URLSearchParams(window.location.search);

    if (visibleCurrentPage > 1) {
      nextSearch.set("page", String(visibleCurrentPage));
    } else {
      nextSearch.delete("page");
    }

    if (productsPerPage !== DEFAULT_PRODUCT_PAGE_SIZE) {
      nextSearch.set("per_page", String(productsPerPage));
    } else {
      nextSearch.delete("per_page");
    }

    const nextSearchText = nextSearch.toString();
    const nextUrl = `${window.location.pathname}${nextSearchText ? `?${nextSearchText}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl === currentUrl) {
      return;
    }

    window.history.pushState(window.history.state || {}, "", nextUrl);
    window.dispatchEvent(new Event("app:navigate"));
  }, [productsPerPage, visibleCurrentPage]);

  useEffect(() => {
    async function loadProducts() {
      if (!getCachedProducts()) {
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
  }, []);

  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim();

    if (!trimmedSearchTerm) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    let isCancelled = false;
    setSearchLoading(true);

    async function loadSearchResults() {
      try {
        const nextSearchResults = await searchProducts(trimmedSearchTerm, { limit: Math.max(96, productsPerPage * 4) });

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
  }, [productsPerPage, searchTerm]);

  function handleProductsPerPageChange(value) {
    setProductsPerPage(value);
    setCurrentPage(1);
  }

  function handleCatalogFilterApply({ categoryName, filters: nextFilters, searchTerm: nextSearchTerm, sortMode: nextSortMode }) {
    const category = getCategoryByName(categoryName);
    setSelectedCategory(categoryName);
    setSearchTerm(nextSearchTerm);
    setSortMode(nextSortMode);
    setFilters(nextFilters);
    setCurrentPage(1);

    const nextPath = category ? `/category/${category.slug}` : "/category";
    const nextSearch = new URLSearchParams();

    if (productsPerPage !== DEFAULT_PRODUCT_PAGE_SIZE) {
      nextSearch.set("per_page", String(productsPerPage));
    }

    const nextSearchText = nextSearch.toString();
    const nextUrl = `${nextPath}${nextSearchText ? `?${nextSearchText}` : ""}`;

    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.pushState(window.history.state || {}, "", nextUrl);
      window.dispatchEvent(new Event("app:navigate"));
    }
  }

  return (
    <main className="products-page">
      <div className="products-layout">
        <section className="products-shell">
          <div className="products-header">
            <div className="products-heading">
              <span className="products-kicker">Инструменти</span>
              <h1>{selectedCategory || "Всички продукти"}</h1>
            </div>
            <div className="products-filter-footer products-heading-meta">
              <div className="products-filter-meta">
                <strong>{totalProductsCount}</strong>
                <span>{totalProductsCount === 1 ? "намерен продукт" : "намерени продукта"}</span>
              </div>
              <ProductPageSizeSelect
                pageSize={productsPerPage}
                onPageSizeChange={handleProductsPerPageChange}
              />
            </div>
            <CatalogFilterPanel
              filters={filters}
              priceBounds={priceBounds}
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
              <div className="products-empty">Зареждане...</div>
            ) : totalProductsCount === 0 ? (
              <div className="products-empty">Няма намерени продукти в тази категория.</div>
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
                            <span className="product-card-media-placeholder">{selectedCategory || "Продукт"}</span>
                          )}
                        </span>
                      </a>
                      <div className="product-card-content">
                        {categoryNames && <span>{categoryNames}</span>}
                        <h2><a href={productPath}>{product.name}</a></h2>
                        {plainDescription && <p>{plainDescription}</p>}

                        <div className="product-card-footer">
                          {product.hasVariants ? (
                            <span className="product-card-footer-info product-card-footer-info--variant">Натисни преглед за още подробности</span>
                          ) : (
                            <strong>{formatPrice(product.price)}</strong>
                          )}

                          <a href={productPath} className="product-card-action">Преглед</a>
                        </div>
                      </div>
                    </article>
                  );
                  })}
                </div>

                <ProductPagination
                  currentPage={visibleCurrentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
        />
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
