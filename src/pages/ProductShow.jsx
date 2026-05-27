import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, getCartSessionId, normalizeErrors } from "../api/client";
import { fetchEquipmentProducts } from "../api/equipment";
import { fetchProducts, getCachedProducts } from "../api/products";
import { useCallback } from "react";
import CustomSelect from "../components/form/CustomSelect";
import {
  formatPrice,
  getProductCategoryLabel,
  getPurchasableState,
  hasProductVariants,
  isVariantAvailable,
  stripHtml,
} from "../utils/products";
import { normalizeSearchText } from "../utils/search";
import "../styles/product-show.css";

function getProductImages(product) {
  if (!product?.images?.length) {
    return product?.image ? [{ id: "primary", url: product.image }] : [];
  }

  return [...product.images].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function getMaxPurchasableQuantity(purchasable) {
  if (!purchasable?.isAvailable) {
    return 0;
  }

  const quantity = Number(purchasable.quantity || 0);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function hasPositivePrice(value) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0;
}

function hasRichTextContent(value) {
  return stripHtml(value).length > 0;
}

function getProductPath(product) {
  return `/products/${product.slug || product.id}`;
}

function getProductIdentity(product) {
  return String(product?.id || product?.slug || "");
}

function resetScrollToTop() {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  root.scrollTop = 0;
  document.body.scrollTop = 0;
  root.style.scrollBehavior = previousScrollBehavior;
}

export default function ProductShow({ productKey }) {
  const [products, setProducts] = useState(() => getCachedProducts() || []);
  const [loading, setLoading] = useState(() => !getCachedProducts());
  const [messages, setMessages] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeImage, setActiveImage] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [activeDetailsTab, setActiveDetailsTab] = useState("sizes");
  const [variantTableSearch, setVariantTableSearch] = useState("");
  const relatedScrollerRef = useRef(null);

  useEffect(() => {
    resetScrollToTop();
  }, [productKey]);

  useEffect(() => {
    if (loading) {
      return undefined;
    }

    resetScrollToTop();
    const frameId = window.requestAnimationFrame(() => resetScrollToTop());

    return () => window.cancelAnimationFrame(frameId);
  }, [loading, productKey]);

  const product = useMemo(
    () => products.find((item) => item.slug === productKey || String(item.id) === String(productKey)),
    [productKey, products],
  );

  const refreshProducts = useCallback(async () => {
    let normalizedProducts = await fetchProducts();
    let foundProduct = normalizedProducts.find((item) => item.slug === productKey || String(item.id) === String(productKey));

    if (!foundProduct && getCachedProducts()) {
      normalizedProducts = await fetchProducts({ force: true });
      foundProduct = normalizedProducts.find((item) => item.slug === productKey || String(item.id) === String(productKey));
    }

    if (!foundProduct) {
      try {
        const normalizedEquipment = await fetchEquipmentProducts();
        const foundEquipment = normalizedEquipment.find((item) => item.slug === productKey || String(item.id) === String(productKey));

        if (foundEquipment) {
          normalizedProducts = normalizedEquipment;
          foundProduct = foundEquipment;
        }
      } catch {
        // Equipment is optional; product pages should still work without that endpoint.
      }
    }

    setProducts(normalizedProducts);
    setActiveImage(foundProduct?.image || "");
  }, [productKey]);

  useEffect(() => {
    async function loadProduct() {
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

    loadProduct();
  }, [refreshProducts]);

  const safeSelectedVariantId = useMemo(() => {
    if (!hasProductVariants(product)) {
      return "";
    }

    return product.variants.some((variant) => String(variant.id) === String(selectedVariantId))
      ? selectedVariantId
      : "";
  }, [product, selectedVariantId]);

  const purchasable = useMemo(
    () => getPurchasableState(product, safeSelectedVariantId),
    [product, safeSelectedVariantId],
  );

  const maxPurchasableQuantity = useMemo(
    () => getMaxPurchasableQuantity(purchasable),
    [purchasable],
  );

  const safePurchaseQuantity = maxPurchasableQuantity > 0
    ? Math.min(Math.max(purchaseQuantity, 1), maxPurchasableQuantity)
    : 1;
  const hasPurchasablePrice = hasPositivePrice(purchasable.price);
  const canAddToCart = !adding && !purchasable.needsVariant && purchasable.isAvailable && hasPurchasablePrice;

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function addToCart() {
    if (hasProductVariants(product) && !safeSelectedVariantId) {
      setMessages(["Изберете тип/размер преди добавяне в количката."]);
      return;
    }

    if (!purchasable.isAvailable) {
      setMessages(["Продуктът не е наличен."]);
      return;
    }

    if (!hasPositivePrice(purchasable.price)) {
      setMessages(["Този тип/размер няма въведена цена и не може да бъде поръчан. Изберете друг тип/размер."]);
      return;
    }

    const quantity = Number(safePurchaseQuantity);

    if (!Number.isFinite(quantity) || quantity < 1) {
      setMessages(["Изберете валидно количество."]);
      return;
    }

    if (maxPurchasableQuantity > 0 && quantity > maxPurchasableQuantity) {
      setMessages(["Не може да закупите повече."]);
      return;
    }

    setAdding(true);
    setMessages([]);
    setSuccessMessage("");

    try {
      await apiRequest(`/api/cart/add/${product.id}`, {
        method: "POST",
        body: JSON.stringify({
          quantity,
          ...(safeSelectedVariantId ? { product_variant_id: safeSelectedVariantId } : {}),
          session_id: getCartSessionId(),
        }),
      });
      window.dispatchEvent(new Event("cart:changed"));
      setSuccessMessage("Продуктът беше добавен в количката.");
    } catch (error) {
      setMessages(normalizeErrors(error));
      try {
        await refreshProducts();
      } catch {
        // Keep the backend validation message visible even if refresh fails.
      }
    } finally {
      setAdding(false);
    }
  }

  function updateQuantity(nextValue) {
    const parsed = Number(nextValue);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const clamped = Math.max(1, maxPurchasableQuantity > 0 ? Math.min(parsed, maxPurchasableQuantity) : parsed);
    setPurchaseQuantity(clamped);
  }

  if (loading) {
    return (
      <main className="product-show-page">
        <section className="product-show-shell">
          <div className="product-show-empty">Зареждане...</div>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="product-show-page">
        <section className="product-show-shell">
          <div className="product-show-empty">Продуктът не е намерен.</div>
        </section>
      </main>
    );
  }

  const categoryNames = product.categories.map((category) => category.name).filter(Boolean).join(", ");
  const description = product.plainDescription || stripHtml(product.description);
  const extraInformation = product.extraInformation || "";
  const hasExtraInformation = hasRichTextContent(extraInformation);
  const hasSizeTable = hasProductVariants(product);
  const detailsTabs = [
    hasSizeTable ? { id: "sizes", label: "Таблица с типове/размери" } : null,
    hasExtraInformation ? { id: "info", label: "Допълнителна информация" } : null,
  ].filter(Boolean);
  const selectedDetailsTab = detailsTabs.some((tab) => tab.id === activeDetailsTab)
    ? activeDetailsTab
    : detailsTabs[0]?.id;
  const imageOptions = getProductImages(product);
  const activeImageIndex = Math.max(0, imageOptions.findIndex((image) => image.url === activeImage));
  const relatedProducts = (product.relatedProducts || [])
    .filter((relatedProduct) => getProductIdentity(relatedProduct) !== getProductIdentity(product));
  const variantOptions = hasProductVariants(product)
    ? product.variants.map((variant) => {
      const isAvailable = isVariantAvailable(variant);
      const hasPrice = hasPositivePrice(variant.price);
      const availabilityLabel = !isAvailable
        ? "изчерпан"
        : hasPrice
          ? "в наличност"
          : "няма въведена цена";

      return {
        value: String(variant.id),
        label: `${variant.size} - ${formatPrice(variant.price)} (${availabilityLabel})`,
        disabled: !isAvailable || !hasPrice,
      };
    })
    : [];
  const normalizedVariantTableSearch = normalizeSearchText(variantTableSearch);
  const visibleTableVariants = hasSizeTable && normalizedVariantTableSearch
    ? product.variants.filter((variant) => normalizeSearchText(variant.size).includes(normalizedVariantTableSearch))
    : product.variants;

  function goToImage(offset) {
    if (imageOptions.length <= 1) {
      return;
    }

    const nextIndex = (activeImageIndex + offset + imageOptions.length) % imageOptions.length;
    const nextImage = imageOptions[nextIndex]?.url || "";
    setActiveImage(nextImage);
    setPreviewImage((current) => (current ? nextImage : current));
  }

  function scrollRelatedProducts(direction) {
    const scroller = relatedScrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      left: direction * 280,
      behavior: "smooth",
    });
  }

  return (
    <main className="product-show-page">
      <section className="product-show-shell">
        <div className="product-show-grid">
          <div className="product-show-gallery">
            <div className="product-show-image-wrap">
              <button
                type="button"
                className="product-show-image"
                onClick={() => activeImage && setPreviewImage(activeImage)}
                aria-label="Отвори снимката"
              >
                {activeImage ? <img src={activeImage} alt={product.name} loading="eager" fetchPriority="high" decoding="async" /> : <span>Няма снимка</span>}
              </button>

              {imageOptions.length > 1 && (
                <>
                  <button
                    type="button"
                    className="product-gallery-arrow product-gallery-arrow--prev"
                    onClick={() => goToImage(-1)}
                    aria-label="Предишна снимка"
                  />
                  <button
                    type="button"
                    className="product-gallery-arrow product-gallery-arrow--next"
                    onClick={() => goToImage(1)}
                    aria-label="Следваща снимка"
                  />
                </>
              )}
            </div>

            {imageOptions.length > 1 && (
              <div className="product-thumbs" aria-label="Снимки на продукта">
                {imageOptions.map((image) => (
                  <button
                    type="button"
                    className={image.url === activeImage ? "is-active" : ""}
                    onClick={() => setActiveImage(image.url)}
                    key={image.id || image.url}
                    aria-label="Покажи снимка"
                  >
                    <img src={image.url} alt="" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-show-info">
            <span className="products-kicker">{categoryNames || "Продукт"}</span>
            <h1>{product.name}</h1>
            {description && <p className="product-show-description">{description}</p>}

            <div className="product-show-meta">
              {(!hasProductVariants(product) || !purchasable.needsVariant) && (
                <div className={purchasable.isAvailable ? "product-stock is-available" : "product-stock"}>
                  {purchasable.isAvailable ? "В наличност" : "Не е наличен"}
                </div>
              )}
              {product.slug && <span className="product-code">Код: {product.slug}</span>}
            </div>

            <div className="product-show-buy">
              {hasProductVariants(product) && (
                <CustomSelect
                  ariaLabel="Избор на тип/размер"
                  value={safeSelectedVariantId}
                  onChange={(value) => {
                    setSelectedVariantId(value);
                    setPurchaseQuantity(1);
                  }}
                  options={[{ value: "", label: "Изберете тип/размер", disabled: true }, ...variantOptions]}
                  placeholder="Изберете тип/размер"
                  searchPlaceholder="Търси по тип/размер"
                />
              )}

              {!purchasable.needsVariant && (
                <>
                  <strong>{formatPrice(purchasable.price)}</strong>

                  <div className="product-show-quantity-control" aria-label={`Количество за ${product.name}`}>
                    <button
                      type="button"
                      className="product-show-qty-btn"
                      onClick={() => updateQuantity(safePurchaseQuantity - 1)}
                      disabled={adding || safePurchaseQuantity <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={maxPurchasableQuantity > 0 ? maxPurchasableQuantity : undefined}
                      value={safePurchaseQuantity}
                      onChange={(event) => updateQuantity(event.target.value)}
                      disabled={adding || !purchasable.isAvailable || !hasPurchasablePrice}
                      aria-label="Количество"
                    />
                    <button
                      type="button"
                      className="product-show-qty-btn"
                      onClick={() => updateQuantity(safePurchaseQuantity + 1)}
                      disabled={adding || maxPurchasableQuantity <= 0 || safePurchaseQuantity >= maxPurchasableQuantity}
                    >
                      +
                    </button>
                  </div>
                </>
              )}

              <button
                type="button"
                className="product-show-add-button"
                onClick={addToCart}
                disabled={!canAddToCart}
              >
                {adding
                  ? "Добавяне..."
                  : purchasable.needsVariant
                    ? "Избери тип/размер"
                    : !purchasable.isAvailable
                      ? "Изчерпан"
                      : hasPurchasablePrice
                        ? "Добави в количката"
                        : "Няма цена"}
              </button>

              {(successMessage || messages.length > 0) && (
                <div
                  className={successMessage ? "product-show-buy-notice is-success" : "product-show-buy-notice"}
                  role={successMessage ? "status" : "alert"}
                  aria-live="polite"
                >
                  {successMessage ? (
                    <p>{successMessage}</p>
                  ) : (
                    messages.map((message) => <p key={message}>{message}</p>)
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="product-show-related" aria-labelledby="related-products-title">
            <div className="product-show-related-header">
              <h2 id="related-products-title">Свързани продукти</h2>
              {relatedProducts.length > 1 && (
                <div className="product-show-related-controls" aria-label="Навигация за свързани продукти">
                  <button type="button" onClick={() => scrollRelatedProducts(-1)} aria-label="Предишни свързани продукти" />
                  <button type="button" onClick={() => scrollRelatedProducts(1)} aria-label="Следващи свързани продукти" />
                </div>
              )}
            </div>

            <div className="product-show-related-grid" ref={relatedScrollerRef}>
              {relatedProducts.map((relatedProduct) => {
                const relatedCategory = getProductCategoryLabel(relatedProduct);

                return (
                  <article className="product-show-related-card" key={relatedProduct.id}>
                    <a href={getProductPath(relatedProduct)} className="product-show-related-image" aria-label={relatedProduct.name}>
                      {relatedProduct.image ? (
                        <img src={relatedProduct.image} alt={relatedProduct.name} loading="lazy" decoding="async" />
                      ) : (
                        <span>Няма снимка</span>
                      )}
                    </a>

                    <div className="product-show-related-body">
                      <span className="products-kicker">{relatedCategory}</span>
                      <h3>
                        <a href={getProductPath(relatedProduct)}>{relatedProduct.name}</a>
                      </h3>

                      <div className="product-show-related-footer">
                        <strong>
                          {hasProductVariants(relatedProduct)
                            ? "Цена според вариант"
                            : formatPrice(relatedProduct.price)}
                        </strong>
                        <a className="product-show-related-link" href={getProductPath(relatedProduct)}>
                          Преглед
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {detailsTabs.length > 0 && (
          <div className="product-show-details">
            {detailsTabs.length > 1 && (
              <div className="product-show-tabs" role="tablist" aria-label="Информация за продукта">
                {detailsTabs.map((tab) => (
                  <button
                    type="button"
                    className={selectedDetailsTab === tab.id ? "is-active" : ""}
                    onClick={() => setActiveDetailsTab(tab.id)}
                    role="tab"
                    aria-selected={selectedDetailsTab === tab.id}
                    key={tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {detailsTabs.length === 1 && <h2>{detailsTabs[0].label}</h2>}

            <div className="product-show-details-panel">
              {selectedDetailsTab === "sizes" && hasSizeTable && (
                <>
                  <label className="product-show-size-search">
                    <span>Търси по тип/размер</span>
                    <input
                      type="search"
                      value={variantTableSearch}
                      onChange={(event) => setVariantTableSearch(event.target.value)}
                      placeholder="Търси по тип/размер"
                    />
                  </label>

                  <div className="product-show-table-wrap">
                    <table className="product-show-size-table">
                      <thead>
                        <tr>
                          <th>Тип/Размер</th>
                          <th>Цена</th>
                          <th>Наличност</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTableVariants.length > 0 ? visibleTableVariants.map((variant) => (
                          <tr key={variant.id}>
                            <td>{variant.size || "-"}</td>
                            <td>{formatPrice(variant.price)}</td>
                            <td>{isVariantAvailable(variant) ? "В наличност" : "Изчерпан"}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="3" className="product-show-size-empty">
                              Няма типове/размери, които съвпадат с търсенето.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {selectedDetailsTab === "info" && hasExtraInformation && (
                <div
                  className="product-show-details-content"
                  dangerouslySetInnerHTML={{ __html: extraInformation }}
                />
              )}
            </div>
          </div>
        )}
      </section>

      {previewImage && (
        <div className="image-preview" role="dialog" aria-modal="true" onClick={() => setPreviewImage("")}>
          <div className="image-preview-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="image-preview-close" onClick={() => setPreviewImage("")} aria-label="Затвори">
              ×
            </button>
            {imageOptions.length > 1 && (
              <>
                <button
                  type="button"
                  className="image-preview-arrow image-preview-arrow--prev"
                onClick={() => goToImage(-1)}
                aria-label="Предишна снимка"
                />
                <button
                  type="button"
                  className="image-preview-arrow image-preview-arrow--next"
                  onClick={() => goToImage(1)}
                  aria-label="Следваща снимка"
                />
              </>
            )}
            <img src={previewImage} alt={product.name} decoding="async" />
          </div>
        </div>
      )}
    </main>
  );
}

