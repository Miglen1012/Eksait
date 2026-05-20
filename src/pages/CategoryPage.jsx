import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, normalizeErrors } from "../api/client";
import CustomSelect from "../components/form/CustomSelect";
import { categories, getCategoryByName, getCategoryBySlug } from "../data/categories";
import { formatPrice, getPurchasableState, normalizeProducts, stripHtml } from "../utils/products";
import { normalizeSearchText } from "../utils/search";
import "../styles/products.css";

const PRODUCTS_PER_PAGE = 12;
const sortOptions = [
  { value: "default", label: "Подредба" },
  { value: "name", label: "По име" },
  { value: "price-asc", label: "Цена възходящо" },
  { value: "price-desc", label: "Цена низходящо" },
];
const productNameCollator = new Intl.Collator("bg-BG", { sensitivity: "base", numeric: true });

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

function getProductSearchText(product) {
  return normalizeSearchText([
    product.name,
    product.slug,
    stripHtml(product.description),
    ...product.categories.map((category) => category.name),
  ].filter(Boolean).join(" "));
}

function ProductFilters({ searchTerm, selectedCategory, sortMode, totalCount, onSearchChange, onSelectCategory, onSortChange }) {
  return (
    <div className="products-filter-panel">
      <div className="products-filter-top">
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
      </div>

      <div className="products-filter-meta">
        <strong>{totalCount}</strong>
        <span>{totalCount === 1 ? "намерен продукт" : "намерени продукта"}</span>
      </div>

      <div className="category-links" aria-label="Категории">
        <button
          type="button"
          className={selectedCategory ? "" : "is-active"}
          onClick={() => onSelectCategory("")}
        >
          Всички
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
    </div>
  );
}

export default function CategoryPage({ slug }) {
  const initialCategory = getCategoryBySlug(slug)?.label || "";
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const productsMainRef = useRef(null);

  async function refreshProducts() {
    const data = await apiRequest("/api/products");
    setProducts(normalizeProducts(data));
  }

  const filteredProducts = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm);

    const nextProducts = products.filter((product) => {
      const matchesCategory = selectedCategory
        ? product.categories?.some((category) => category.name === selectedCategory)
        : true;
      const matchesSearch = normalizedSearchTerm
        ? getProductSearchText(product).includes(normalizedSearchTerm)
        : true;

      return matchesCategory && matchesSearch;
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
  }, [products, searchTerm, selectedCategory, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const visibleCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (visibleCurrentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredProducts, visibleCurrentPage]);

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
      setCurrentPage(1);
    }

    window.addEventListener("popstate", handleHistoryChange);
    window.addEventListener("app:navigate", handleHistoryChange);

    return () => {
      window.removeEventListener("popstate", handleHistoryChange);
      window.removeEventListener("app:navigate", handleHistoryChange);
    };
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
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

  function handleCategorySelect(categoryName) {
    const category = getCategoryByName(categoryName);
    setSelectedCategory(categoryName);
    setCurrentPage(1);

    const nextPath = category ? `/category/${category.slug}` : "/category";

    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
      window.dispatchEvent(new Event("app:navigate"));
    }
  }

  function handleSearchChange(value) {
    setSearchTerm(value);
    setCurrentPage(1);
  }

  function handleSortChange(value) {
    setSortMode(value);
    setCurrentPage(1);
  }

  return (
    <main className="products-page">
      <div className="products-layout">
        <section className="products-shell">
          <div className="products-header">
            <span className="products-kicker">Инструменти</span>
            <h1>{selectedCategory || "Всички продукти"}</h1>
            <ProductFilters
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              sortMode={sortMode}
              totalCount={filteredProducts.length}
              onSearchChange={handleSearchChange}
              onSelectCategory={handleCategorySelect}
              onSortChange={handleSortChange}
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

            {loading ? (
              <div className="products-empty">Зареждане...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="products-empty">Няма намерени продукти в тази категория.</div>
            ) : (
              <>
                <div className="products-grid">
                  {paginatedProducts.map((product) => {
                  const categoryNames = product.categories.map((category) => category.name).join(", ");
                  const purchasable = getPurchasableState(product, "");
                  const productPath = getProductPath(product);

                  return (
                    <article className="product-card-item" key={product.id}>
                      <a className="product-card-media" href={productPath}>
                        <span className="product-card-media-frame">
                          {product.image ? (
                            <img src={product.image} alt={product.name} />
                          ) : (
                            <span className="product-card-media-placeholder">{selectedCategory || "Продукт"}</span>
                          )}
                        </span>
                      </a>
                      <div className="product-card-content">
                        {categoryNames && <span>{categoryNames}</span>}
                        <h2><a href={productPath}>{product.name}</a></h2>
                        {product.description && <p>{stripHtml(product.description)}</p>}

                        <div className="product-card-footer">
                          {product.hasVariants ? (
                            <span className="product-card-footer-info product-card-footer-info--variant">Натисни преглед за още подробности</span>
                          ) : (
                            <strong>{formatPrice(purchasable.price)}</strong>
                          )}

                          <a href={productPath} className="product-card-action">Преглед</a>
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
