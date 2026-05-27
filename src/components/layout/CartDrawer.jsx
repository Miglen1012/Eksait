import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, getApiBaseUrl, getCartSessionId, normalizeErrors } from "../../api/client";
import { fetchProducts } from "../../api/products";
import { getCartItemsFromResponse } from "../../utils/cart";
import { getPrimaryImage } from "../../utils/products";
import "../../styles/layout.css";

const cartCachePrefix = "excompany_checkout_cart";

function resolveImageUrl(value) {
  const rawUrl = String(value || "").trim();

  if (!rawUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
    return rawUrl;
  }

  if (rawUrl.startsWith("//")) {
    return `${window.location.protocol}${rawUrl}`;
  }

  const normalizedPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function getLookupKey(value) {
  return String(value ?? "");
}

function buildProductLookup(products) {
  return products.reduce((lookup, product) => {
    const key = getLookupKey(product.id);

    if (key) {
      lookup[key] = product;
    }

    return lookup;
  }, {});
}

async function fetchProductLookup() {
  try {
    return buildProductLookup(await fetchProducts());
  } catch {
    return {};
  }
}

function getItemImage(item, product, catalogProduct) {
  const imageUrl = (
    getPrimaryImage(product.images || []) ||
    product.image ||
    product.thumbnail ||
    product.image_url ||
    item.image ||
    item.thumbnail ||
    item.image_url ||
    catalogProduct?.image ||
    ""
  );

  return resolveImageUrl(imageUrl);
}

function hasValue(value) {
  return value !== null && typeof value !== "undefined" && value !== "";
}

function cartNeedsProductLookup(cartData) {
  return getCartItemsFromResponse(cartData).some((item) => {
    const product = item.product || item;
    const hasName = Boolean(product.name || item.name);
    const hasPrice = [item.price, product.price, product.unit_price].some(hasValue);
    const hasImage = Boolean(
      getPrimaryImage(product.images || []) ||
      product.image ||
      product.thumbnail ||
      product.image_url ||
      item.image ||
      item.thumbnail ||
      item.image_url
    );

    return !hasName || !hasPrice || !hasImage;
  });
}

function normalizeDrawerItems(cartData, productLookup = {}) {
  const items = getCartItemsFromResponse(cartData);

  return items.map((item) => {
    const product = item.product || item;
    const productId = item.product_id || product.id || item.id;
    const variant = item.variant || {};
    const catalogProduct = productLookup[getLookupKey(productId)] || productLookup[productId];
    const quantity = Number(item.quantity || item.qty || 1);
    const price = Number(item.price || product.price || product.unit_price || catalogProduct?.price || 0);

    return {
      id: productId,
      variantId: item.product_variant_id ?? variant.id ?? null,
      variantSize: variant.size || item.variant_size || "",
      name: product.name || item.name || catalogProduct?.name || `Продукт #${productId}`,
      image: getItemImage(item, product, catalogProduct),
      quantity,
      price,
      lineTotal: Number(item.total || item.line_total || price * quantity),
    };
  });
}

function formatPrice(value) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function getCartCacheKey() {
  return `${cartCachePrefix}:${getCartSessionId()}`;
}

function readCartCache() {
  try {
    const rawValue = localStorage.getItem(getCartCacheKey());

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return null;
  }
}

function writeCartCache(items) {
  try {
    const existing = readCartCache() || {};

    localStorage.setItem(getCartCacheKey(), JSON.stringify({
      ...existing,
      items: Array.isArray(items) ? items : [],
      updatedAt: Date.now(),
    }));
  } catch {
    // Ignore cache write failures and keep the live drawer state in memory.
  }
}

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [cachedCart] = useState(() => readCartCache());
  const [items, setItems] = useState(() => cachedCart?.items || []);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const productLookupRef = useRef(null);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.lineTotal, 0),
    [items],
  );

  const getProductLookup = useCallback(async () => {
    if (!productLookupRef.current) {
      productLookupRef.current = await fetchProductLookup();
    }

    return productLookupRef.current;
  }, []);

  const getProductLookupForCart = useCallback(async (cartData) => (
    cartNeedsProductLookup(cartData) ? await getProductLookup() : {}
  ), [getProductLookup]);

  const loadDrawerCart = useCallback(async () => {
    setMessages([]);
    const hasCachedItems = items.length > 0;
    setLoading(!hasCachedItems);

    try {
      const cartData = await apiRequest("/api/cart");
      const lookup = await getProductLookupForCart(cartData);
      const nextItems = normalizeDrawerItems(cartData, lookup);
      setItems(nextItems);
      writeCartCache(nextItems);
    } catch (error) {
      setMessages(normalizeErrors(error));
    } finally {
      setLoading(false);
    }
  }, [getProductLookupForCart, items.length]);

  function navigateToCheckout() {
    setIsOpen(false);
    window.history.pushState({}, "", "/checkout");
    window.dispatchEvent(new Event("app:navigate"));
  }

  useEffect(() => {
    function openDrawer() {
      setIsOpen(true);
      loadDrawerCart();
    }

    function refreshIfOpen() {
      if (isOpen) {
        loadDrawerCart();
      }
    }

    window.addEventListener("cart:open", openDrawer);
    window.addEventListener("cart:changed", refreshIfOpen);

    return () => {
      window.removeEventListener("cart:open", openDrawer);
      window.removeEventListener("cart:changed", refreshIfOpen);
    };
  }, [isOpen, loadDrawerCart]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <div className={isOpen ? "cart-drawer is-open" : "cart-drawer"} aria-hidden={!isOpen}>
      <button type="button" className="cart-drawer-backdrop" onClick={() => setIsOpen(false)} aria-label="Затвори количката"></button>

      <aside className="cart-drawer-panel" aria-label="Количка">
        <div className="cart-drawer-header">
          <div>
            <span>Вашата поръчка</span>
            <h2>Количка</h2>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} aria-label="Затвори">×</button>
        </div>

        <div className="cart-drawer-body">
          {messages.length > 0 && (
            <div className="cart-drawer-alert">
              {messages.map((message) => <p key={message}>{message}</p>)}
            </div>
          )}

          {loading ? (
            <div className="cart-drawer-empty">Зареждане...</div>
          ) : items.length === 0 ? (
            <div className="cart-drawer-empty">Количката е празна.</div>
          ) : (
            <div className="cart-drawer-items">
              {items.map((item) => (
                <article className="cart-drawer-item" key={`${item.id}:${item.variantId || ""}`}>
                  <div className="cart-drawer-thumb">
                    {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <span>{item.name.charAt(0)}</span>}
                  </div>
                  <div>
                    <h3>{item.name}</h3>
                    {item.variantSize && <p>{item.variantSize}</p>}
                    <p>{item.quantity} × {formatPrice(item.price)}</p>
                  </div>
                  <strong>{formatPrice(item.lineTotal)}</strong>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="cart-drawer-footer">
          <p><span>Общо</span><strong>{formatPrice(subtotal)}</strong></p>
          <button type="button" onClick={navigateToCheckout}>Към поръчката</button>
          <button type="button" onClick={() => setIsOpen(false)}>Продължи пазаруването</button>
        </div>
      </aside>
    </div>
  );
}
