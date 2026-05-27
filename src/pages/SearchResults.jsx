import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeErrors } from "../api/client";
import { getCachedProducts, searchProducts } from "../api/products";
import ProductPagination, { ProductPageSizeSelect } from "../components/products/ProductPagination";
import { DEFAULT_PRODUCT_PAGE_SIZE, getPageSizeFromSearch } from "../utils/pagination";
import { formatPrice, stripHtml } from "../utils/products";
import { getProductUrl, normalizeSearchText } from "../utils/search";
import "../styles/products.css";

function getSearchQuery() {
  return new URLSearchParams(window.location.search).get("q")?.trim() || "";
}

function getPageFromSearch() {
  const rawPage = Number.parseInt(new URLSearchParams(window.location.search).get("page") || "1", 10);
  return Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
}

function getProductSearchText(product) {
  if (product?.searchText) {
    return String(product.searchText);
  }

  return normalizeSearchText([
    product?.name,
    product?.slug,
    product?.material,
    stripHtml(product?.description),
    ...(product?.categories || []).map((category) => category?.name),
  ].filter(Boolean).join(" "));
}

export default function SearchResults() {
  const [query, setQuery] = useState(getSearchQuery());
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(getPageFromSearch);
  const [productsPerPage, setProductsPerPage] = useState(getPageSizeFromSearch);
  const [loading, setLoading] = useState(() => !getCachedProducts());
  const [messages, setMessages] = useState([]);
  const productsMainRef = useRef(null);
  const totalProductsCount = products.length;
  const totalPages = Math.max(1, Math.ceil(products.length / productsPerPage));
  const visibleCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = products.slice((visibleCurrentPage - 1) * productsPerPage, visibleCurrentPage * productsPerPage);

  const refreshSearchProducts = useCallback(async (searchQuery = query) => {
    if (!searchQuery) {
      setProducts([]);
      return;
    }

    const normalizedQuery = normalizeSearchText(searchQuery);
    const searchLimit = Math.max(48, productsPerPage * 6);
    const nextProducts = await searchProducts(searchQuery, { limit: searchLimit });
    setProducts(nextProducts.filter((product) => getProductSearchText(product).includes(normalizedQuery)));
  }, [productsPerPage, query]);

  useEffect(() => {
    function handleNavigation() {
      setQuery(getSearchQuery());
      setCurrentPage(getPageFromSearch());
      setProductsPerPage(getPageSizeFromSearch());
    }

    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("app:navigate", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("app:navigate", handleNavigation);
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
      if (!query) {
        setProducts([]);
        setLoading(false);
        return;
      }

      if (!getCachedProducts()) {
        setLoading(true);
      }
      setMessages([]);

      try {
        await refreshSearchProducts(query);
      } catch (error) {
        setMessages(normalizeErrors(error));
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [query, refreshSearchProducts]);

  useEffect(() => {
    if (loading || !productsMainRef.current) {
      return;
    }

    const top = window.scrollY + productsMainRef.current.getBoundingClientRect().top - 118;
    window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "auto" });
  }, [visibleCurrentPage, loading]);

  function handleProductsPerPageChange(value) {
    setProductsPerPage(value);
    setCurrentPage(1);
  }

  return (
    <main className="products-page">
      <div className="products-layout">
        <section className="products-shell">
          <div className="products-header">
            <span className="products-kicker">Търсене</span>
            <h1>{query ? `Продукти с името "${query}"` : "Търсене на продукти"}</h1>
            <p>Резултатите се търсят по име, категория, описание и код на продукта.</p>
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
          </div>

          <div className="products-main" ref={productsMainRef}>
            {messages.length > 0 && (
              <div className="products-alert">
                {messages.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )}

            {loading ? (
              <div className="products-empty">Зареждане...</div>
            ) : totalProductsCount === 0 ? (
              <div className="products-empty search-empty">
                <h2>Няма намерени резултати{query ? ` за "${query}"` : ""}.</h2>
                <p>Опитайте с друго име или разгледайте всички продукти.</p>
                <a href="/category" className="products-empty-link">Към продуктите</a>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {paginatedProducts.map((product) => {
                  const categoryNames = product.categoryNames || product.categories.map((category) => category.name).join(", ");
                  const productUrl = getProductUrl(product);
                  const plainDescription = product.plainDescription || "";

                  return (
                    <article className="product-card-item" key={product.id}>
                      <a className="product-card-media" href={productUrl}>
                        <span className="product-card-media-frame">
                          {product.image ? (
                            <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
                          ) : (
                            <span className="product-card-media-placeholder">Продукт</span>
                          )}
                        </span>
                      </a>
                      <div className="product-card-content">
                        {categoryNames && <span>{categoryNames}</span>}
                        <h2><a href={productUrl}>{product.name}</a></h2>
                        {plainDescription && <p>{plainDescription}</p>}

                        <div className="product-card-footer">
                          {product.hasVariants ? (
                            <span className="product-card-footer-info product-card-footer-info--variant">Натисни преглед за още подробности</span>
                          ) : (
                            <strong>{formatPrice(product.price)}</strong>
                          )}

                          <a href={productUrl} className="product-card-action">Преглед</a>
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
