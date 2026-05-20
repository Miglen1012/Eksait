import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, normalizeErrors } from "../api/client";
import { formatPrice, getPurchasableState, normalizeProducts, stripHtml } from "../utils/products";
import { getProductUrl } from "../utils/search";
import "../styles/products.css";

const PRODUCTS_PER_PAGE = 12;

function getSearchQuery() {
  return new URLSearchParams(window.location.search).get("q")?.trim() || "";
}

export default function SearchResults() {
  const [query, setQuery] = useState(getSearchQuery());
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const productsMainRef = useRef(null);
  const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
  const visibleCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = products.slice((visibleCurrentPage - 1) * PRODUCTS_PER_PAGE, visibleCurrentPage * PRODUCTS_PER_PAGE);

  const refreshSearchProducts = useCallback(async (searchQuery = query) => {
    if (!searchQuery) {
      setProducts([]);
      return;
    }

    const data = await apiRequest(`/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=48`);
    setProducts(normalizeProducts(data));
  }, [query]);

  useEffect(() => {
    function handleNavigation() {
      setQuery(getSearchQuery());
      setCurrentPage(1);
    }

    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("app:navigate", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("app:navigate", handleNavigation);
    };
  }, []);

  useEffect(() => {
    async function loadProducts() {
      if (!query) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
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

  return (
    <main className="products-page">
      <div className="products-layout">
        <section className="products-shell">
          <div className="products-header">
            <span className="products-kicker">Търсене</span>
            <h1>{query ? `Продукти с името "${query}"` : "Търсене на продукти"}</h1>
            <p>Резултатите се търсят по име, категория, описание и код на продукта.</p>
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
            ) : products.length === 0 ? (
              <div className="products-empty search-empty">
                <h2>Няма намерени резултати{query ? ` за "${query}"` : ""}.</h2>
                <p>Опитайте с друго име или разгледайте всички продукти.</p>
                <a href="/category" className="products-empty-link">Към продуктите</a>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {paginatedProducts.map((product) => {
                  const categoryNames = product.categories.map((category) => category.name).join(", ");
                  const purchasable = getPurchasableState(product, "");
                  const productUrl = getProductUrl(product);

                  return (
                    <article className="product-card-item" key={product.id}>
                      <a className="product-card-media" href={productUrl}>
                        <span className="product-card-media-frame">
                          {product.image ? (
                            <img src={product.image} alt={product.name} />
                          ) : (
                            <span className="product-card-media-placeholder">Продукт</span>
                          )}
                        </span>
                      </a>
                      <div className="product-card-content">
                        {categoryNames && <span>{categoryNames}</span>}
                        <h2><a href={productUrl}>{product.name}</a></h2>
                        {product.description && <p>{stripHtml(product.description)}</p>}

                        <div className="product-card-footer">
                          {product.hasVariants ? (
                            <span className="product-card-footer-info product-card-footer-info--variant">Натисни преглед за още подробности</span>
                          ) : (
                            <strong>{formatPrice(purchasable.price)}</strong>
                          )}

                          <a href={productUrl} className="product-card-action">Преглед</a>
                        </div>
                      </div>
                    </article>
                  );
                  })}
                </div>

                {totalPages > 1 && (
                  <nav className="products-pagination" aria-label="Pagination">
                    <button
                      type="button"
                      className="products-pagination-button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={visibleCurrentPage === 1}
                    >
                      Назад
                    </button>

                    <div className="products-pagination-pages">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const pageNumber = index + 1;

                        return (
                          <button
                            type="button"
                            key={pageNumber}
                            className={pageNumber === visibleCurrentPage ? "products-page-number is-active" : "products-page-number"}
                            onClick={() => setCurrentPage(pageNumber)}
                            aria-current={pageNumber === visibleCurrentPage ? "page" : undefined}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="products-pagination-button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={visibleCurrentPage === totalPages}
                    >
                      Напред
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
