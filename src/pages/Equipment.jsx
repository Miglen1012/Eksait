import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeErrors } from "../api/client";
import { fetchEquipmentProducts } from "../api/equipment";
import { searchProducts } from "../api/products";
import CustomSelect from "../components/form/CustomSelect";
import ProductPagination, { ProductPageSizeSelect } from "../components/products/ProductPagination";
import { DEFAULT_PRODUCT_PAGE_SIZE, getPageSizeFromSearch } from "../utils/pagination";
import { formatPrice } from "../utils/products";
import { normalizeSearchText } from "../utils/search";
import "../styles/products.css";
import "../styles/equipment.css";

const sortOptions = [
  { value: "name-asc", label: "По име А-Я" },
  { value: "name-desc", label: "По име Я-А" },
  { value: "price-asc", label: "Цена възходяща" },
  { value: "price-desc", label: "Цена низходяща" },
];
const equipmentCollator = new Intl.Collator("bg-BG", { sensitivity: "base", numeric: true });
const PRICE_RANGE_STEP = 0.01;
const sortValues = new Set(sortOptions.map((option) => option.value));

function getPageFromSearch() {
  const rawPage = Number.parseInt(new URLSearchParams(window.location.search).get("page") || "1", 10);
  return Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
}

function getSortModeFromSearch() {
  const sortMode = new URLSearchParams(window.location.search).get("sort") || "default";
  return sortValues.has(sortMode) ? sortMode : "default";
}

function getEquipmentFiltersFromSearch() {
  const search = new URLSearchParams(window.location.search);

  return {
    search: search.get("q") || "",
    minPrice: search.get("min_price") || "",
    maxPrice: search.get("max_price") || "",
  };
}

function getProductPath(product) {
  return `/products/${product.slug || product.id}`;
}

function getProductPrice(product) {
  if (product.hasVariants && product.variants.length > 0) {
    const variantPrices = product.variants
      .map((variant) => Number(variant.price))
      .filter((price) => Number.isFinite(price) && price > 0);

    return variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
  }

  const price = Number(product.price);
  return Number.isFinite(price) ? price : 0;
}

function getPriceBounds(products) {
  const prices = products
    .map(getProductPrice)
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

function productMatchesSearchTerm(product, searchTerm) {
  const normalizedSearchTerm = normalizeSearchText(searchTerm);

  if (!normalizedSearchTerm) {
    return true;
  }

  return String(product.searchText || "").includes(normalizedSearchTerm);
}

function getSearchScopedProducts(products, searchTerm) {
  return products.filter((product) => productMatchesSearchTerm(product, searchTerm));
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

function buildEquipmentSearchParams({ filters, productsPerPage, sortMode, page = 1 }) {
  const nextSearch = new URLSearchParams();

  if (page > 1) {
    nextSearch.set("page", String(page));
  }

  if (productsPerPage !== DEFAULT_PRODUCT_PAGE_SIZE) {
    nextSearch.set("per_page", String(productsPerPage));
  }

  setSearchParam(nextSearch, "q", filters.search);
  setSearchParam(nextSearch, "min_price", filters.minPrice);
  setSearchParam(nextSearch, "max_price", filters.maxPrice);

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

function EquipmentFilters({ filters, products, sortMode, onApply }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);
  const [draftSortMode, setDraftSortMode] = useState(sortMode);
  const draftPriceBounds = useMemo(
    () => getPriceBounds(getSearchScopedProducts(products, draftFilters.search)),
    [draftFilters.search, products],
  );
  const activeCount = [
    filters.search,
    filters.minPrice,
    filters.maxPrice,
    sortMode !== "default" ? sortMode : "",
  ].filter(Boolean).length;

  function syncDraftFilters() {
    setDraftFilters(filters);
    setDraftSortMode(sortMode);
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
    setDraftFilters({
      search: "",
      minPrice: "",
      maxPrice: "",
    });
    setDraftSortMode("default");
  }

  function applyDraftFilters() {
    onApply({
      filters: sanitizePriceFilters(draftFilters, draftPriceBounds),
      sortMode: draftSortMode,
    });
    setIsOpen(false);
  }

  return (
    <section className="catalog-filter-menu equipment-filter-menu" aria-label="Филтри за оборудване">
      <button
        type="button"
        className={isOpen ? "catalog-filter-toggle is-open" : "catalog-filter-toggle"}
        onClick={toggleFilters}
        aria-expanded={isOpen}
      >
        <span>Филтри</span>
        {activeCount > 0 && <strong>{activeCount}</strong>}
      </button>

      {isOpen && (
        <div className="catalog-filter-panel equipment-filter-panel">
          <div className="catalog-filter-column">
            <div className="catalog-filter-title">
              <span className="products-kicker">Филтри</span>
              <h2>Уточни оборудването</h2>
            </div>

            <div className="catalog-filter-fields">
              <label className="products-search-field">
                <span>Търсене</span>
                <input
                  type="search"
                  value={draftFilters.search}
                  onChange={(event) => updateDraftFilter("search", event.target.value)}
                  placeholder="Търси оборудване"
                />
              </label>

              <label className="products-sort-field">
                <span>Сортиране</span>
                <CustomSelect
                  ariaLabel="Сортиране"
                  value={draftSortMode}
                  onChange={setDraftSortMode}
                  options={sortOptions}
                  placeholder="Избери"
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

function EquipmentCard({ product }) {
  const categoryNames = product.categoryNames || product.categories.map((category) => category.name).join(", ");
  const productPath = getProductPath(product);
  const plainDescription = product.plainDescription || "";

  return (
    <article className="product-card-item">
      <a className="product-card-media" href={productPath}>
        <span className="product-card-media-frame">
          {product.image ? (
            <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
          ) : (
            <span className="product-card-media-placeholder">Оборудване</span>
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
}

export default function Equipment() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(getEquipmentFiltersFromSearch);
  const [sortMode, setSortMode] = useState(getSortModeFromSearch);
  const [currentPage, setCurrentPage] = useState(getPageFromSearch);
  const [productsPerPage, setProductsPerPage] = useState(getPageSizeFromSearch);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const historyEntryScrollPersistedRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadEquipment() {
      setLoading(true);
      setMessages([]);

      try {
        if (!isCancelled) {
          setProducts(await fetchEquipmentProducts());
        }
      } catch (error) {
        if (!isCancelled) {
          setMessages(normalizeErrors(error));
          setProducts([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadEquipment();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleHistoryChange() {
      setFilters(getEquipmentFiltersFromSearch());
      setSortMode(getSortModeFromSearch());
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
    const trimmedSearch = filters.search.trim();

    if (!trimmedSearch) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    let isCancelled = false;
    setSearchLoading(true);

    async function loadSearchResults() {
      try {
        const nextSearchResults = await searchProducts(trimmedSearch, { limit: Math.max(96, productsPerPage * 4) });

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
  }, [filters.search, productsPerPage]);

  const filteredProducts = useMemo(() => {
    const minPrice = filters.minPrice === "" ? null : Number(filters.minPrice);
    const maxPrice = filters.maxPrice === "" ? null : Number(filters.maxPrice);
    const equipmentProductIds = new Set(products.map((product) => String(product.id)));
    const searchScopedProducts = filters.search
      ? (searchResults || []).filter((product) => equipmentProductIds.has(String(product.id)))
      : products;

    const nextProducts = searchScopedProducts.filter((product) => {
      const price = getProductPrice(product);
      const matchesMinPrice = minPrice === null || !Number.isFinite(minPrice) || price >= minPrice;
      const matchesMaxPrice = maxPrice === null || !Number.isFinite(maxPrice) || price <= maxPrice;

      return matchesMinPrice && matchesMaxPrice;
    });

    return [...nextProducts].sort((firstProduct, secondProduct) => {
      if (sortMode === "name-asc") {
        return equipmentCollator.compare(firstProduct.name, secondProduct.name);
      }

      if (sortMode === "name-desc") {
        return equipmentCollator.compare(secondProduct.name, firstProduct.name);
      }

      if (sortMode === "price-asc") {
        return getProductPrice(firstProduct) - getProductPrice(secondProduct);
      }

      if (sortMode === "price-desc") {
        return getProductPrice(secondProduct) - getProductPrice(firstProduct);
      }

      return 0;
    });
  }, [filters, products, searchResults, sortMode]);

  const totalProductsCount = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const visibleCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (visibleCurrentPage - 1) * productsPerPage,
    visibleCurrentPage * productsPerPage,
  );

  useEffect(() => {
    const nextSearch = buildEquipmentSearchParams({
      filters,
      productsPerPage,
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
  }, [filters, productsPerPage, sortMode, visibleCurrentPage]);

  function handleProductsPerPageChange(value) {
    persistCurrentScrollPosition();
    historyEntryScrollPersistedRef.current = true;
    setProductsPerPage(value);
    setCurrentPage(1);
  }

  function handlePageChange(page) {
    persistCurrentScrollPosition();
    historyEntryScrollPersistedRef.current = true;
    setCurrentPage(page);
  }

  function handleFilterApply({ filters: nextFilters, sortMode: nextSortMode }) {
    setFilters(nextFilters);
    setSortMode(nextSortMode);
    setCurrentPage(1);

    const nextSearch = buildEquipmentSearchParams({
      filters: nextFilters,
      productsPerPage,
      sortMode: nextSortMode,
      page: 1,
    });
    const nextSearchText = nextSearch.toString();
    const nextUrl = `/equipment${nextSearchText ? `?${nextSearchText}` : ""}`;

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
    <main className="products-page equipment-page">
      <div className="products-layout equipment-layout">
        <section className="products-shell">
          <div className="products-header">
            <div className="products-heading equipment-heading">
              <span className="products-kicker">Оборудване</span>
              <h1>Оборудване</h1>
            </div>

            <div className="products-filter-footer products-heading-meta equipment-results-meta">
              <div className="products-filter-meta">
                <strong>{totalProductsCount}</strong>
                <span>{totalProductsCount === 1 ? "намерен продукт" : "намерени продукта"}</span>
              </div>
              <ProductPageSizeSelect
                pageSize={productsPerPage}
                onPageSizeChange={handleProductsPerPageChange}
              />
            </div>

            <EquipmentFilters
              filters={filters}
              products={products}
              sortMode={sortMode}
              onApply={handleFilterApply}
            />
          </div>

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
            <div className="products-empty equipment-empty">
              <h2>Няма добавено оборудване.</h2>
              <p>Когато добавите оборудване през backend-а, то ще се появи автоматично тук.</p>
            </div>
          ) : (
            <>
              <div className="products-grid">
                {paginatedProducts.map((product) => (
                  <EquipmentCard product={product} key={product.id || product.slug} />
                ))}
              </div>

              <ProductPagination
                currentPage={visibleCurrentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
