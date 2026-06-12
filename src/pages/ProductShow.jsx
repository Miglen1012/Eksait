import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, getCartSessionId, normalizeErrors } from "../api/client";
import { fetchEquipmentProducts } from "../api/equipment";
import { fetchProducts, getCachedProducts } from "../api/products";
import { useCallback } from "react";
import CustomSelect from "../components/form/CustomSelect";
import ProductPagination from "../components/products/ProductPagination";
import { useLanguage } from "../utils/language";
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

const VARIANT_TABLE_PAGE_SIZE = 10;

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

function getProductDisplayCode(product, selectedVariantId) {
  const selectedVariant = hasProductVariants(product)
    ? product.variants.find((variant) => String(variant.id) === String(selectedVariantId))
    : null;

  const code =
    selectedVariant?.relatedProductId ??
    selectedVariant?.productId ??
    product?.id;

  return code === null || typeof code === "undefined" || code === "" ? "" : String(code);
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
  const { language, t } = useLanguage();
  const [products, setProducts] = useState(() => getCachedProducts(language) || []);
  const [loading, setLoading] = useState(() => !getCachedProducts(language));
  const [messages, setMessages] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeImage, setActiveImage] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [addingTarget, setAddingTarget] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [variantQuantities, setVariantQuantities] = useState({});
  const [activeDetailsTab, setActiveDetailsTab] = useState("sizes");
  const [variantTableSearch, setVariantTableSearch] = useState("");
  const [variantTablePaging, setVariantTablePaging] = useState({ page: 1, productKey: "", search: "" });
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
    let normalizedProducts = await fetchProducts({ language });
    let foundProduct = normalizedProducts.find((item) => item.slug === productKey || String(item.id) === String(productKey));

    if (!foundProduct && getCachedProducts(language)) {
      normalizedProducts = await fetchProducts({ force: true, language });
      foundProduct = normalizedProducts.find((item) => item.slug === productKey || String(item.id) === String(productKey));
    }

    if (!foundProduct) {
      try {
        const normalizedEquipment = await fetchEquipmentProducts({ language });
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
  }, [language, productKey]);

  useEffect(() => {
    async function loadProduct() {
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
  const adding = Boolean(addingTarget);
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

  function getVariantPurchasable(variantId) {
    return getPurchasableState(product, variantId);
  }

  function getVariantMaxPurchasableQuantity(variantId) {
    return getMaxPurchasableQuantity(getVariantPurchasable(variantId));
  }

  function getSafeVariantQuantity(variantId) {
    const maxQuantity = getVariantMaxPurchasableQuantity(variantId);
    const rawQuantity = Number(variantQuantities[variantId] ?? 1);

    if (!Number.isFinite(rawQuantity) || rawQuantity < 1) {
      return 1;
    }

    return maxQuantity > 0
      ? Math.min(Math.max(rawQuantity, 1), maxQuantity)
      : Math.max(rawQuantity, 1);
  }

  async function addToCart({ variantId = "", quantity, target = "main" } = {}) {
    if (hasProductVariants(product) && !variantId) {
      setMessages([t("product.mustSelectSize")]);
      return;
    }

    const nextPurchasable = variantId ? getVariantPurchasable(variantId) : purchasable;
    const maxQuantity = getMaxPurchasableQuantity(nextPurchasable);

    if (!nextPurchasable.isAvailable) {
      setMessages([t("product.unavailableMessage")]);
      return;
    }

    if (!hasPositivePrice(nextPurchasable.price)) {
      setMessages([t("product.noPriceMessage")]);
      return;
    }

    const normalizedQuantity = Number(quantity);

    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 1) {
      setMessages([t("product.invalidQuantity")]);
      return;
    }

    if (maxQuantity > 0 && normalizedQuantity > maxQuantity) {
      setMessages([t("product.tooMany")]);
      return;
    }

    setAddingTarget(target);
    setMessages([]);
    setSuccessMessage("");

    try {
      await apiRequest(`/api/cart/add/${product.id}`, {
        method: "POST",
        body: JSON.stringify({
          quantity: normalizedQuantity,
          ...(variantId ? { product_variant_id: variantId } : {}),
          session_id: getCartSessionId(),
        }),
      });
      window.dispatchEvent(new Event("cart:changed"));
      setSuccessMessage(t("product.addedToCart"));
    } catch (error) {
      setMessages(normalizeErrors(error));
      try {
        await refreshProducts();
      } catch {
        // Keep the backend validation message visible even if refresh fails.
      }
    } finally {
      setAddingTarget("");
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

  function updateVariantQuantity(variantId, nextValue) {
    const parsed = Number(nextValue);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const maxQuantity = getVariantMaxPurchasableQuantity(variantId);
    const clamped = Math.max(1, maxQuantity > 0 ? Math.min(parsed, maxQuantity) : parsed);

    setVariantQuantities((current) => ({
      ...current,
      [variantId]: clamped,
    }));
  }

  if (loading) {
    return (
      <main className="product-show-page">
        <section className="product-show-shell">
          <div className="product-show-empty">{t("common.loading")}</div>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="product-show-page">
        <section className="product-show-shell">
          <div className="product-show-empty">{t("product.notFound")}</div>
        </section>
      </main>
    );
  }

  const categoryNames = product.categories.map((category) => category.name).filter(Boolean).join(", ");
  const description = product.plainDescription || stripHtml(product.description);
  const extraInformation = product.extraInformation || "";
  const productDisplayCode = getProductDisplayCode(product, safeSelectedVariantId);
  const hasExtraInformation = hasRichTextContent(extraInformation);
  const hasSizeTable = hasProductVariants(product);
  const detailsTabs = [
    hasSizeTable ? { id: "sizes", label: t("product.sizeTable") } : null,
    hasExtraInformation ? { id: "info", label: t("product.extraInfo") } : null,
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
        ? t("product.outOfStockLower")
        : hasPrice
          ? t("product.variantAvailableLower")
          : t("product.variantNoPriceLower");

      return {
        value: String(variant.id),
        label: `${variant.size} - ${formatPrice(variant.price)} (${availabilityLabel})`,
        disabled: !isAvailable || !hasPrice,
      };
    })
    : [];
  const normalizedVariantTableSearch = normalizeSearchText(variantTableSearch);
  const filteredTableVariants = hasSizeTable
    ? (
      normalizedVariantTableSearch
        ? product.variants.filter((variant) => normalizeSearchText(variant.size).includes(normalizedVariantTableSearch))
        : product.variants
    )
    : [];
  const variantTableTotalPages = Math.max(1, Math.ceil(filteredTableVariants.length / VARIANT_TABLE_PAGE_SIZE));
  const requestedVariantTablePage = (
    variantTablePaging.productKey === productKey &&
    variantTablePaging.search === normalizedVariantTableSearch
  )
    ? variantTablePaging.page
    : 1;
  const safeVariantTablePage = Math.min(requestedVariantTablePage, variantTableTotalPages);
  const variantTableStartIndex = (safeVariantTablePage - 1) * VARIANT_TABLE_PAGE_SIZE;
  const paginatedTableVariants = filteredTableVariants.slice(
    variantTableStartIndex,
    variantTableStartIndex + VARIANT_TABLE_PAGE_SIZE,
  );
  const variantTableEndIndex = Math.min(variantTableStartIndex + paginatedTableVariants.length, filteredTableVariants.length);

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
                aria-label={t("product.imageOpen")}
              >
                {activeImage ? <img src={activeImage} alt={product.name} loading="eager" fetchPriority="high" decoding="async" /> : <span>{t("common.noImage")}</span>}
              </button>

              {imageOptions.length > 1 && (
                <>
                  <button
                    type="button"
                    className="product-gallery-arrow product-gallery-arrow--prev"
                    onClick={() => goToImage(-1)}
                    aria-label={t("product.imagePrevious")}
                  />
                  <button
                    type="button"
                    className="product-gallery-arrow product-gallery-arrow--next"
                    onClick={() => goToImage(1)}
                    aria-label={t("product.imageNext")}
                  />
                </>
              )}
            </div>

            {imageOptions.length > 1 && (
              <div className="product-thumbs" aria-label={t("product.imageThumbs")}>
                {imageOptions.map((image) => (
                  <button
                    type="button"
                    className={image.url === activeImage ? "is-active" : ""}
                    onClick={() => setActiveImage(image.url)}
                    key={image.id || image.url}
                    aria-label={t("product.imageShow")}
                  >
                    <img src={image.url} alt="" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-show-info">
            <span className="products-kicker">{categoryNames || t("common.product")}</span>
            <h1>{product.name}</h1>
            {description && <p className="product-show-description">{description}</p>}

            <div className="product-show-meta">
              {(!hasProductVariants(product) || !purchasable.needsVariant) && (
                <div className={purchasable.isAvailable ? "product-stock is-available" : "product-stock"}>
                  {purchasable.isAvailable ? t("product.available") : t("product.notAvailable")}
                </div>
              )}
              {productDisplayCode && <span className="product-code">{t("product.code")}: {productDisplayCode}</span>}
            </div>

            <div className="product-show-buy">
              {hasProductVariants(product) && (
                <CustomSelect
                  ariaLabel={t("product.selectSize")}
                  value={safeSelectedVariantId}
                  onChange={(value) => {
                    setSelectedVariantId(value);
                    setPurchaseQuantity(1);
                  }}
                  options={[{ value: "", label: t("product.selectSize"), disabled: true }, ...variantOptions]}
                  placeholder={t("product.selectSize")}
                  searchPlaceholder={t("product.searchSize")}
                />
              )}

              {!purchasable.needsVariant && (
                <>
                  <strong>{formatPrice(purchasable.price)}</strong>

                  <div className="product-show-quantity-control" aria-label={t("product.quantityFor", { name: product.name })}>
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
                      aria-label={t("product.quantity")}
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
                onClick={() => addToCart({
                  variantId: safeSelectedVariantId,
                  quantity: safePurchaseQuantity,
                  target: "main",
                })}
                disabled={!canAddToCart}
              >
                {addingTarget === "main"
                  ? t("common.adding")
                  : purchasable.needsVariant
                    ? t("product.selectSizeShort")
                    : !purchasable.isAvailable
                      ? t("product.outOfStock")
                      : hasPurchasablePrice
                        ? t("product.addToCart")
                        : t("product.noPrice")}
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
              <h2 id="related-products-title">{t("product.related")}</h2>
              {relatedProducts.length > 1 && (
                <div className="product-show-related-controls" aria-label={t("product.relatedNav")}>
                  <button type="button" onClick={() => scrollRelatedProducts(-1)} aria-label={t("product.relatedPrevious")} />
                  <button type="button" onClick={() => scrollRelatedProducts(1)} aria-label={t("product.relatedNext")} />
                </div>
              )}
            </div>

            <div className="product-show-related-grid" ref={relatedScrollerRef}>
              {relatedProducts.map((relatedProduct) => {
                const relatedCategory = getProductCategoryLabel(relatedProduct, t("common.product"));

                return (
                  <article className="product-show-related-card" key={relatedProduct.id}>
                    <a href={getProductPath(relatedProduct)} className="product-show-related-image" aria-label={relatedProduct.name}>
                      {relatedProduct.image ? (
                        <img src={relatedProduct.image} alt={relatedProduct.name} loading="lazy" decoding="async" />
                      ) : (
                        <span>{t("common.noImage")}</span>
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
                            ? t("product.priceByVariant")
                            : formatPrice(relatedProduct.price)}
                        </strong>
                        <a className="product-show-related-link" href={getProductPath(relatedProduct)}>
                          {t("common.view")}
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
              <div className="product-show-tabs" role="tablist" aria-label={t("product.detailsAria")}>
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
                    <span>{t("product.searchSize")}</span>
                    <input
                      type="search"
                      value={variantTableSearch}
                      onChange={(event) => setVariantTableSearch(event.target.value)}
                      placeholder={t("product.searchSize")}
                    />
                  </label>

                  {filteredTableVariants.length > 0 && (
                    <div className="product-show-table-meta">
                      <span>
                        {t("product.tableShown", {
                          from: variantTableStartIndex + 1,
                          to: variantTableEndIndex,
                          total: filteredTableVariants.length,
                        })}
                      </span>
                      <span>{t("product.pageSizeHint")}</span>
                    </div>
                  )}

                  <div className="product-show-table-wrap">
                    <table className="product-show-size-table">
                      <thead>
                        <tr>
                          <th>{t("product.size")}</th>
                          <th>{t("price.title")}</th>
                          <th>{t("product.availability")}</th>
                          <th>{t("product.tableQuantity")}</th>
                          <th>{t("product.tableAdd")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTableVariants.length > 0 ? paginatedTableVariants.map((variant) => (
                          <tr key={variant.id}>
                            <td>{variant.size || "-"}</td>
                            <td data-label={t("price.title")}>{formatPrice(variant.price)}</td>
                            <td data-label={t("product.availability")}>{isVariantAvailable(variant) ? t("product.available") : t("product.outOfStock")}</td>
                            <td data-label={t("product.tableQuantity")}>
                              <div className="product-show-table-quantity-control" aria-label={t("product.quantityFor", { name: variant.size || product.name })}>
                                <button
                                  type="button"
                                  className="product-show-table-qty-btn"
                                  onClick={() => updateVariantQuantity(variant.id, getSafeVariantQuantity(variant.id) - 1)}
                                  disabled={addingTarget === `variant:${variant.id}` || getSafeVariantQuantity(variant.id) <= 1}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={getVariantMaxPurchasableQuantity(variant.id) > 0 ? getVariantMaxPurchasableQuantity(variant.id) : undefined}
                                  value={getSafeVariantQuantity(variant.id)}
                                  onChange={(event) => updateVariantQuantity(variant.id, event.target.value)}
                                  disabled={addingTarget === `variant:${variant.id}` || !isVariantAvailable(variant) || !hasPositivePrice(variant.price)}
                                  aria-label={t("product.tableQuantityFor", { name: variant.size || product.name })}
                                />
                                <button
                                  type="button"
                                  className="product-show-table-qty-btn"
                                  onClick={() => updateVariantQuantity(variant.id, getSafeVariantQuantity(variant.id) + 1)}
                                  disabled={
                                    addingTarget === `variant:${variant.id}` ||
                                    getVariantMaxPurchasableQuantity(variant.id) <= 0 ||
                                    getSafeVariantQuantity(variant.id) >= getVariantMaxPurchasableQuantity(variant.id)
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td data-label={t("product.tableAdd")}>
                              <button
                                type="button"
                                className="product-show-table-add-button"
                                onClick={() => {
                                  setSelectedVariantId(String(variant.id));
                                  setPurchaseQuantity(getSafeVariantQuantity(variant.id));
                                  addToCart({
                                    variantId: String(variant.id),
                                    quantity: getSafeVariantQuantity(variant.id),
                                    target: `variant:${variant.id}`,
                                  });
                                }}
                                disabled={
                                  Boolean(addingTarget) ||
                                  !isVariantAvailable(variant) ||
                                  !hasPositivePrice(variant.price)
                                }
                              >
                                {addingTarget === `variant:${variant.id}`
                                  ? t("common.adding")
                                  : !isVariantAvailable(variant)
                                    ? t("product.outOfStock")
                                    : hasPositivePrice(variant.price)
                                      ? t("common.add")
                                      : t("product.noPrice")}
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="5" className="product-show-size-empty">
                              {t("product.noMatchingSizes")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {variantTableTotalPages > 1 && (
                    <ProductPagination
                      currentPage={safeVariantTablePage}
                      totalPages={variantTableTotalPages}
                      onPageChange={(page) => setVariantTablePaging({
                        page,
                        productKey,
                        search: normalizedVariantTableSearch,
                      })}
                    />
                  )}
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
            <button type="button" className="image-preview-close" onClick={() => setPreviewImage("")} aria-label={t("common.close")}>
              ×
            </button>
            {imageOptions.length > 1 && (
              <>
                <button
                  type="button"
                  className="image-preview-arrow image-preview-arrow--prev"
                onClick={() => goToImage(-1)}
                aria-label={t("product.imagePrevious")}
                />
                <button
                  type="button"
                  className="image-preview-arrow image-preview-arrow--next"
                  onClick={() => goToImage(1)}
                  aria-label={t("product.imageNext")}
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

