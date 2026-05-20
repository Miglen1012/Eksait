import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, getApiBaseUrl, normalizeErrors } from "../../api/client";
import { getPrimaryImage, normalizeProducts } from "../../utils/products";
import "../../styles/layout.css";

function getRawCartItems(data) {
  return (
    data?.items ||
    data?.cart?.items ||
    data?.cart_items ||
    data?.data?.items ||
    data?.data?.cart?.items ||
    data?.data?.cart_items ||
    data?.data ||
    data ||
    []
  );
}

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
    const data = await apiRequest("/api/products");
    return buildProductLookup(normalizeProducts(data));
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

function normalizeDrawerItems(cartData, productLookup = {}) {
  const rawItems = getRawCartItems(cartData);
  const items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems);

  return items.map((item) => {
    const product = item.product || item;
    const productId = item.product_id || product.id || item.id;
    const variant = item.variant || {};
    const catalogProduct = productLookup[getLookupKey(productId)] || productLookup[productId];
    const quantity = Number(item.quantity || item.qty || 1);
    const price = Number(item.price || product.price || product.unit_price || catalogProduct?.price || 0);

    return {
      id: productId,
      variantId: item.product_variant_id || variant.id || null,
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

function responseHasCartItems(data) {
  const rawItems = getRawCartItems(data);
  return Array.isArray(rawItems) ? rawItems.length > 0 : Object.keys(rawItems || {}).length > 0;
}

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
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

  const loadDrawerCart = useCallback(async () => {
    setLoading(true);
    setMessages([]);

    try {
      const cartData = await apiRequest("/api/cart");
      const lookup = responseHasCartItems(cartData) ? await getProductLookup() : {};
      setItems(normalizeDrawerItems(cartData, lookup));
    } catch (error) {
      setMessages(normalizeErrors(error));
    } finally {
      setLoading(false);
    }
  }, [getProductLookup]);

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
                    {item.image ? <img src={item.image} alt="" /> : <span>{item.name.charAt(0)}</span>}
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
          <button type="button" onClick={navigateToCheckout}>Към checkout</button>
          <button type="button" onClick={() => setIsOpen(false)}>Продължи пазаруването</button>
        </div>
      </aside>
    </div>
  );
}
