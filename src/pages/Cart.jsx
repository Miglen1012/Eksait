import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, getApiBaseUrl, getAuthToken, normalizeErrors } from "../api/client";
import { getPrimaryImage, normalizeProducts } from "../utils/products";
import { PHONE_ERROR, PHONE_PATTERN, isValidPhone, normalizePhone } from "../utils/validation";
import "../styles/cart.css";

const initialCheckout = {
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  shipping_method: "address",
  shipping_address: "",
  shipping_city: "",
  shipping_postcode: "",
  econt_office_code: "",
  econt_office_name: "",
  econt_office_address: "",
  econt_office_is_aps: false,
  payment_method: "",
  notes: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const shippingMethodOptions = [
  { value: "address", label: "До адрес" },
  { value: "office", label: "До офис" },
  { value: "apm", label: "До Еконтомат" },
];
const paymentMethodOptions = [
  { value: "", label: "--Изберете метод за плащане--", disabled: true },
  { value: "stripe", label: "Карта" },
  { value: "cod", label: "Наложен платеж" },
  { value: "bank_transfer", label: "Банков превод" },
];

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

function getUserFromResponse(data) {
  return data?.user || data?.data?.user || data?.data || data;
}

function getUserPhone(user) {
  return user?.phone || user?.customer_phone || user?.telephone || user?.mobile || "";
}

function getUserName(user) {
  return user?.name || user?.full_name || "";
}

function getUserEmail(user) {
  return user?.email || user?.customer_email || "";
}

function CustomSelect({ disabled = false, name, onChange, options, placeholder, value }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value);
  const buttonLabel = selectedOption?.label || placeholder;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function closeOnOutsideClick(event) {
      if (!selectRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", closeOnOutsideClick);

    return () => {
      window.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [isOpen]);

  function chooseOption(option) {
    if (disabled || option.disabled) {
      return;
    }

    onChange({ target: { name, value: option.value } });
    setIsOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((current) => !current);
    }
  }

  return (
    <div className={`custom-select${isOpen ? " is-open" : ""}${disabled ? " is-disabled" : ""}`} ref={selectRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{buttonLabel}</span>
        <span className="custom-select-chevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              className={`custom-select-option${option.value === value && !option.disabled ? " is-selected" : ""}`}
              key={option.value}
              onClick={() => chooseOption(option)}
              disabled={option.disabled}
              role="option"
              aria-selected={option.value === value}
              title={option.label}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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

function getStockQuantity(item, catalogProduct) {
  const rawStockQuantity =
    item.stock_quantity ??
    item.available_quantity ??
    item.variant?.quantity ??
    item.variant?.stock_quantity ??
    item.product?.quantity ??
    item.product?.stock_quantity ??
    catalogProduct?.quantity;
  const stockQuantity = Number(rawStockQuantity);

  return Number.isFinite(stockQuantity) ? stockQuantity : null;
}

function getItemStock(item, catalogProduct, stockQuantity) {
  if (stockQuantity !== null) {
    return stockQuantity > 0;
  }

  if (typeof item.variant?.stock !== "undefined") {
    return Boolean(item.variant.stock);
  }

  if (typeof item.product?.stock !== "undefined") {
    return Boolean(item.product.stock);
  }

  if (typeof catalogProduct?.stock !== "undefined") {
    return Boolean(catalogProduct.stock);
  }

  return true;
}

function normalizeCartItems(cartData, productLookup = {}) {
  const rawItems = getRawCartItems(cartData);
  const items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems);

  return items.map((item) => {
    const product = item.product || item;
    const productId = item.product_id || product.id || item.id;
    const variant = item.variant || {};
    const catalogProduct = productLookup[getLookupKey(productId)] || productLookup[productId];
    const quantity = Number(item.quantity || item.qty || 1);
    const price = Number(item.price || product.price || product.unit_price || catalogProduct?.price || 0);
    const stockQuantity = getStockQuantity(item, catalogProduct);
    const stock = getItemStock(item, catalogProduct, stockQuantity);

    return {
      id: productId,
      variantId: item.product_variant_id || variant.id || null,
      variantSize: variant.size || item.variant_size || "",
      name: product.name || item.name || catalogProduct?.name || `Продукт #${productId}`,
      image: getItemImage(item, product, catalogProduct),
      quantity,
      price,
      stock,
      stockQuantity,
      lineTotal: Number(item.total || item.line_total || price * quantity),
    };
  });
}

function responseHasCartItems(data) {
  const rawItems = getRawCartItems(data);
  return Array.isArray(rawItems) ? rawItems.length > 0 : Object.keys(rawItems || {}).length > 0;
}

function formatPrice(value) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function getNumericShippingCost(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const normalized = raw.replace(",", ".").match(/-?\d+(\.\d+)?/);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized[0]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function getOfficeShippingCost(office) {
  if (!office) {
    return null;
  }

  const candidateKeys = [
    "shipping_price",
    "delivery_price",
    "deliveryPrice",
    "shippingPrice",
    "courier_price",
    "courierPrice",
    "price",
    "total_price",
    "totalPrice",
    "calculated_price",
    "calculatedPrice",
    "amount",
    "sum",
    "tariff",
  ];

  for (const key of candidateKeys) {
    const amount = getNumericShippingCost(office[key]);

    if (amount !== null) {
      return amount;
    }
  }

  if (office.delivery && typeof office.delivery === "object") {
    for (const key of candidateKeys) {
      const amount = getNumericShippingCost(office.delivery[key]);

      if (amount !== null) {
        return amount;
      }
    }
  }

  return null;
}

function getAvailableQuantity(item) {
  if (!item?.stock) {
    return 0;
  }

  return item.stockQuantity === null ? Infinity : Math.max(0, item.stockQuantity);
}

function toSafeString(value) {
  return typeof value === "string" ? value : "";
}

export default function Cart() {
  const [items, setItems] = useState([]);
  const [checkout, setCheckout] = useState(initialCheckout);
  const [offices, setOffices] = useState([]);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [shippingCost, setShippingCost] = useState(null);
  const [shippingCostLoading, setShippingCostLoading] = useState(false);
  const [shippingCostError, setShippingCostError] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [pendingRemovalIds, setPendingRemovalIds] = useState({});
  const removalTimersRef = useRef({});
  const productLookupRef = useRef(null);

  const isOfficeDelivery = checkout.shipping_method === "office";
  const isApmDelivery = checkout.shipping_method === "apm";
  const needsOffice = isOfficeDelivery || isApmDelivery;
  const isLoggedIn = Boolean(user);
  const customerName = isLoggedIn ? getUserName(user) : checkout.customer_name;
  const customerEmail = isLoggedIn ? getUserEmail(user) : checkout.customer_email;
  const customerPhone = isLoggedIn ? getUserPhone(user) : checkout.customer_phone;

  const itemsTotal = useMemo(
    () => items.reduce((total, item) => total + item.lineTotal, 0),
    [items],
  );

  const checkoutItems = useMemo(
    () => items.map((item) => ({
      product_id: item.id,
      ...(item.variantId ? { product_variant_id: item.variantId } : {}),
      quantity: item.quantity,
    })),
    [items],
  );
  const shippingCalculationItems = useMemo(
    () => items.map((item) => ({
      product_id: item.id,
      variant_id: item.variantId || null,
      quantity: item.quantity,
    })),
    [items],
  );

  const officePlaceholder = !checkout.shipping_city.trim()
    ? "--Изберете град, за да се заредят офисите--"
    : officesLoading
      ? "Зареждане..."
      : isApmDelivery
        ? "--Изберете еконтомат--"
        : "--Изберете офис--";
  const officeSelectDisabled = !checkout.shipping_city.trim() || officesLoading;
  const filteredOffices = useMemo(() => (
    offices.filter((office) => {
      const isAps = Boolean(office?.is_aps ?? office?.isAPS ?? office?.isApm);
      return isApmDelivery ? isAps : !isAps;
    })
  ), [offices, isApmDelivery]);
  const officeOptions = useMemo(
    () => [
      { value: "", label: officePlaceholder, disabled: true },
      ...filteredOffices.map((office) => ({
        value: String(office.code),
        label: `${office.name}${office.address ? ` - ${office.address}` : ""}`,
      })),
    ],
    [officePlaceholder, filteredOffices],
  );
  const selectedOffice = useMemo(
    () => filteredOffices.find((office) => String(office.code) === String(checkout.econt_office_code)),
    [filteredOffices, checkout.econt_office_code],
  );
  const grandTotal = itemsTotal + (shippingCost ?? 0);

  const emptyOfficeSnapshot = {
    econt_office_code: "",
    econt_office_name: "",
    econt_office_address: "",
    econt_office_is_aps: false,
  };

  async function getProductLookup() {
    if (!productLookupRef.current) {
      productLookupRef.current = await fetchProductLookup();
    }

    return productLookupRef.current;
  }

  async function syncCartItems() {
    const cartData = await apiRequest("/api/cart");
    const lookup = responseHasCartItems(cartData) ? await getProductLookup() : {};
    setItems(normalizeCartItems(cartData, lookup));
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialCart() {
      setLoading(true);
      setMessages([]);

      try {
        const cartData = await apiRequest("/api/cart");
        const lookup = responseHasCartItems(cartData) ? await getProductLookup() : {};

        if (!isCancelled) {
          setItems(normalizeCartItems(cartData, lookup));
        }
      } catch (error) {
        if (!isCancelled) {
          setMessages(normalizeErrors(error));
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialCart();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => () => {
    Object.values(removalTimersRef.current).forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!getAuthToken()) {
      return undefined;
    }

    let isCancelled = false;

    async function loadUser() {
      try {
        const data = await apiRequest("/api/me");
        const user = getUserFromResponse(data);

        if (!isCancelled && user) {
          setUser(user);
          setCheckout((current) => ({
            ...current,
            customer_name: current.customer_name || getUserName(user),
            customer_email: current.customer_email || getUserEmail(user),
            customer_phone: current.customer_phone || getUserPhone(user),
          }));
        }
      } catch {
        // The checkout remains usable for guests if /api/me is unavailable.
      }
    }

    loadUser();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const city = checkout.shipping_city.trim();

    async function loadOffices() {
      if (!needsOffice || !city) {
        setOffices([]);
        setOfficesLoading(false);
        return;
      }

      setOfficesLoading(true);

      try {
        const data = await apiRequest(`/api/checkout/econt-offices?city=${encodeURIComponent(city)}`);

        if (!isCancelled) {
          setOffices(Array.isArray(data?.offices) ? data.offices : []);
        }
      } catch {
        if (!isCancelled) {
          setOffices([]);
        }
      } finally {
        if (!isCancelled) {
          setOfficesLoading(false);
        }
      }
    }

    loadOffices();

    return () => {
      isCancelled = true;
    };
  }, [needsOffice, checkout.shipping_city]);

  useEffect(() => {
    let isCancelled = false;
    let timerId = 0;

    async function calculateShipping() {
      const city = toSafeString(checkout.shipping_city).trim();
      const isOffice = checkout.shipping_method === "office" || checkout.shipping_method === "apm";
      const isAddress = checkout.shipping_method === "address";
      const hasOfficeData = city && Boolean(selectedOffice);
      const hasAddressData = city && toSafeString(checkout.shipping_postcode).trim() && toSafeString(checkout.shipping_address).trim();
      const hasPaymentMethod = checkout.payment_method.trim().length > 0;

      if ((isOffice && !hasOfficeData) || (isAddress && !hasAddressData) || !hasPaymentMethod) {
        const officeFallback = isOffice ? getOfficeShippingCost(selectedOffice) : null;
        setShippingCost(officeFallback);
        setShippingCostError("");
        setShippingCostLoading(false);
        return;
      }

      setShippingCostLoading(true);
      setShippingCostError("");

      try {
        const payload = {
          shipping_method: checkout.shipping_method,
          shipping_city: city,
          payment_method: checkout.payment_method,
          items: shippingCalculationItems,
          ...(isAddress
            ? {
                shipping_postcode: toSafeString(checkout.shipping_postcode).trim(),
                shipping_address: toSafeString(checkout.shipping_address).trim(),
              }
            : {
                econt_office_code: selectedOffice?.code ? String(selectedOffice.code) : "",
                econt_office_name: selectedOffice?.name || "",
                econt_office_address: selectedOffice?.address || "",
                econt_office_is_aps: Boolean(selectedOffice?.is_aps ?? selectedOffice?.isAPS ?? selectedOffice?.isApm),
              }),
        };

        console.log("SHIPPING ADDRESS TYPE DEBUG", typeof checkout.shipping_address, checkout.shipping_address);
        console.log("SHIPPING DEBUG", {
          shipping_method: checkout.shipping_method,
          shipping_city: checkout.shipping_city,
          shipping_postcode: checkout.shipping_postcode,
          shipping_address: checkout.shipping_address,
          checkout_econt_office_code: checkout.econt_office_code,
          selectedOffice,
          filteredOffices,
          selectedOfficeCode: selectedOffice?.code,
          selectedOfficeName: selectedOffice?.name,
          selectedOfficeIsAps: selectedOffice?.is_aps,
          payload,
        });

        const data = await apiRequest("/api/checkout/calculate-shipping", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (isCancelled) {
          return;
        }

        const responseCost = getOfficeShippingCost(data) ?? getOfficeShippingCost(data?.data) ?? getOfficeShippingCost(data?.shipping);
        const fallbackCost = isOffice ? getOfficeShippingCost(selectedOffice) : null;
        setShippingCost(responseCost ?? fallbackCost);
        setShippingCostError(responseCost === null && fallbackCost === null ? "Неуспешно изчисляване на доставка" : "");
      } catch (error) {
        console.log("CALCULATE SHIPPING 422", {
          status: error?.status,
          message: error?.message,
          errors: error?.errors,
          data: error?.data,
        });

        if (!isCancelled) {
          const fallbackCost = isOffice ? getOfficeShippingCost(selectedOffice) : null;
          setShippingCost(fallbackCost);
          setShippingCostError(fallbackCost === null ? "Неуспешно изчисляване на доставка" : "");
        }
      } finally {
        if (!isCancelled) {
          setShippingCostLoading(false);
        }
      }
    }

    timerId = window.setTimeout(calculateShipping, 380);

    return () => {
      isCancelled = true;
      window.clearTimeout(timerId);
    };
  }, [
    checkout.shipping_method,
    checkout.shipping_city,
    checkout.shipping_postcode,
    checkout.shipping_address,
    checkout.econt_office_code,
    checkout.payment_method,
    shippingCalculationItems,
    selectedOffice,
    filteredOffices,
  ]);

  function updateCheckoutField(event) {
    const { name, value } = event.target;

    setCheckout((current) => ({
      ...current,
      [name]: value,
      ...(name === "shipping_method" && (value === "office" || value === "apm")
        ? { shipping_address: "", shipping_postcode: "", ...emptyOfficeSnapshot }
        : {}),
      ...(name === "shipping_method" && value === "address"
        ? { ...emptyOfficeSnapshot }
        : {}),
      ...(name === "shipping_city" ? { ...emptyOfficeSnapshot } : {}),
    }));
    setMessages([]);
  }

  async function updateQuantity(productId, quantity, variantId = null) {
    const cartItem = items.find((item) => item.id === productId && String(item.variantId || "") === String(variantId || ""));
    const requestedQuantity = Math.max(1, Number(quantity) || 1);
    const availableQuantity = getAvailableQuantity(cartItem);
    const nextQuantity = Math.min(requestedQuantity, availableQuantity);

    if (availableQuantity <= 0) {
      setMessages([`${cartItem?.name || "Продуктът"} вече не е наличен.`]);
      return;
    }

    if (requestedQuantity > availableQuantity) {
      setMessages(["Не може да закупите повече."]);
    } else {
      setMessages([]);
    }

    if (cartItem && nextQuantity === cartItem.quantity) {
      return;
    }

    setSavingProductId(productId);

    try {
      const data = await apiRequest(`/api/cart/update/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({
          quantity: nextQuantity,
          ...(variantId ? { product_variant_id: variantId } : {}),
        }),
      });

      if (responseHasCartItems(data)) {
        const lookup = responseHasCartItems(data) ? await getProductLookup() : {};
        setItems(normalizeCartItems(data, lookup));
      } else {
        setItems((currentItems) => currentItems.map((item) => (
          item.id === productId && String(item.variantId || "") === String(variantId || "")
            ? { ...item, quantity: nextQuantity, lineTotal: item.price * nextQuantity }
            : item
        )));
      }

      window.dispatchEvent(new Event("cart:changed"));
    } catch (error) {
      setMessages(normalizeErrors(error));
      try {
        await syncCartItems();
      } catch {
        // Keep the backend validation message visible even if refresh fails.
      }
    } finally {
      setSavingProductId(null);
    }
  }

  async function performRemoveItem(productId, variantId = null) {
    const lineKey = getCartLineKey(productId, variantId);
    setSavingProductId(productId);
    setMessages([]);
    setPendingRemovalIds((current) => {
      const next = { ...current };
      delete next[lineKey];
      return next;
    });

    try {
      const query = variantId ? `?product_variant_id=${encodeURIComponent(variantId)}` : "";
      const data = await apiRequest(`/api/cart/delete/${productId}${query}`, {
        method: "DELETE",
      });

      if (responseHasCartItems(data)) {
        const lookup = responseHasCartItems(data) ? await getProductLookup() : {};
        setItems(normalizeCartItems(data, lookup));
      } else {
        setItems((currentItems) => currentItems.filter((item) => !(item.id === productId && String(item.variantId || "") === String(variantId || ""))));
      }

      window.dispatchEvent(new Event("cart:changed"));
    } catch (error) {
      setMessages(normalizeErrors(error));
    } finally {
      setSavingProductId(null);
    }
  }

  function getCartLineKey(productId, variantId = null) {
    return `${productId}:${variantId || ""}`;
  }

  function removeItem(productId, variantId = null) {
    const lineKey = getCartLineKey(productId, variantId);

    if (pendingRemovalIds[lineKey]) {
      return;
    }

    setMessages([]);
    setPendingRemovalIds((current) => ({ ...current, [lineKey]: true }));
    removalTimersRef.current[lineKey] = setTimeout(() => {
      delete removalTimersRef.current[lineKey];
      performRemoveItem(productId, variantId);
    }, 4000);
  }

  function cancelRemoveItem(productId, variantId = null) {
    const lineKey = getCartLineKey(productId, variantId);
    clearTimeout(removalTimersRef.current[lineKey]);
    delete removalTimersRef.current[lineKey];
    setPendingRemovalIds((current) => {
      const next = { ...current };
      delete next[lineKey];
      return next;
    });
  }

  async function clearCart() {
    setMessages([]);
    Object.values(removalTimersRef.current).forEach(clearTimeout);
    removalTimersRef.current = {};
    setPendingRemovalIds({});

    try {
      await apiRequest("/api/cart", { method: "DELETE" });
      setItems([]);
      window.dispatchEvent(new Event("cart:changed"));
    } catch (error) {
      setMessages(normalizeErrors(error));
    }
  }

  function buildCheckoutPayload() {
    const isAddressDelivery = checkout.shipping_method === "address";
    const payload = {
      shipping_method: checkout.shipping_method,
      shipping_city: checkout.shipping_city.trim(),
      payment_method: checkout.payment_method,
      locale: "bg",
      notes: checkout.notes.trim(),
      items: checkoutItems,
    };

    if (!isLoggedIn) {
      payload.customer_name = checkout.customer_name.trim();
      payload.customer_email = checkout.customer_email.trim();
      payload.customer_phone = normalizePhone(checkout.customer_phone);
    }

    if (isAddressDelivery) {
      payload.shipping_address = checkout.shipping_address.trim();
      payload.shipping_postcode = checkout.shipping_postcode.trim();
    }

    if (needsOffice) {
      payload.econt_office_code = selectedOffice?.code ? String(selectedOffice.code) : "";
      payload.econt_office_name = selectedOffice?.name || "";
      payload.econt_office_address = selectedOffice?.address || "";
      payload.econt_office_is_aps = Boolean(selectedOffice?.is_aps ?? selectedOffice?.isAPS ?? selectedOffice?.isApm);
    }

    return payload;
  }

  function validateCheckout() {
    const errors = [];
    const normalizedCustomerPhone = normalizePhone(customerPhone);

    if (!customerName.trim()) {
      errors.push("Въведете име и фамилия.");
    }

    if (!customerEmail.trim()) {
      errors.push("Въведете имейл адрес.");
    } else if (!EMAIL_PATTERN.test(customerEmail.trim())) {
      errors.push("Въведете валиден имейл адрес.");
    }

    if (!isValidPhone(normalizedCustomerPhone, { required: true })) {
      errors.push(PHONE_ERROR);
    }

    if (!checkout.shipping_city.trim()) {
      errors.push("Въведете град за доставка.");
    }

    if (checkout.shipping_method === "address") {
      if (!checkout.shipping_postcode.trim()) {
        errors.push("Въведете пощенски код.");
      }

      if (!checkout.shipping_address.trim()) {
        errors.push("Въведете адрес за доставка.");
      }
    }

    if (needsOffice && !selectedOffice) {
      errors.push("Изберете офис за доставка.");
    }

    if (!checkout.payment_method) {
      errors.push("Изберете метод на плащане.");
    }

    items.forEach((item) => {
      const availableQuantity = getAvailableQuantity(item);

      if (availableQuantity <= 0) {
        errors.push(`${item.name} вече не е наличен.`);
        return;
      }

      if (item.quantity > availableQuantity) {
        errors.push(`Не може да закупите повече от ${item.name}.`);
      }
    });

    if (isLoggedIn && errors.includes(PHONE_ERROR)) {
      errors.push("Телефонът е заключен към профила. Обновете данните в профила си преди поръчка.");
    }

    return errors;
  }

  async function submitCheckout(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessages([]);

    const validationErrors = validateCheckout();

    if (validationErrors.length > 0) {
      setMessages(validationErrors);
      setSubmitting(false);
      return;
    }

    try {
      const data = await apiRequest("/api/checkout", {
        method: "POST",
        body: JSON.stringify(buildCheckoutPayload()),
      });

      if (data?.checkout_url) {
        window.location.assign(data.checkout_url);
        return;
      }

      if (data?.success) {
        window.location.assign(`/checkout/success?order_id=${data.order_id}`);
        return;
      }

      setMessages([data?.message || "Поръчката не беше завършена. Моля, опитайте отново."]);
    } catch (error) {
      setMessages(normalizeErrors(error));
      try {
        await syncCartItems();
      } catch {
        // Keep the backend validation message visible even if refresh fails.
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="cart-page">
      <section className="cart-shell">
        <header className="cart-header">
          <span className="cart-kicker">Вашата поръчка</span>
          <h1>Количка</h1>
          <p>Прегледайте избраните продукти, въведете данни за доставка и завършете поръчката.</p>
        </header>

        {messages.length > 0 && (
          <div className="cart-alert">
            {messages.map((message) => <p key={message}>{message}</p>)}
          </div>
        )}

        {loading ? (
          <div className="cart-empty">
            <h2>Зареждане...</h2>
          </div>
        ) : items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M2 3h3l3 12h10l3-8H7" />
              </svg>
            </div>
            <h2>Количката е празна</h2>
            <p>След като добавите продукти, те ще се появят тук.</p>
            <a className="cart-empty-link" href="/">Към началото</a>
          </div>
        ) : (
          <div className="cart-checkout-layout">
            <section className="cart-items-panel">
              <div className="cart-panel-heading">
                <h2>Продукти</h2>
                <button type="button" onClick={clearCart}>Изчисти количката</button>
              </div>

              <div className="cart-items">
                {items.map((item) => (
                  <article className="cart-item" key={getCartLineKey(item.id, item.variantId)}>
                    <div className="cart-product-info">
                      <div className="cart-product-thumb">
                        {item.image ? <img src={item.image} alt="" /> : <span>{item.name.charAt(0)}</span>}
                      </div>
                      <div>
                        <h3>{item.name}</h3>
                        {item.variantSize && <p className="cart-variant-note">{item.variantSize}</p>}
                        <p>{formatPrice(item.price)} / бр.</p>
                      </div>
                    </div>

                    <div className="quantity-control" aria-label={`Количество за ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantId)}
                        disabled={savingProductId === item.id || item.quantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={Number.isFinite(item.stockQuantity) ? item.stockQuantity : undefined}
                        value={item.quantity}
                        onChange={(event) => updateQuantity(item.id, event.target.value, item.variantId)}
                        disabled={savingProductId === item.id || !item.stock}
                        aria-label="Количество"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId)}
                        disabled={savingProductId === item.id || item.quantity >= getAvailableQuantity(item)}
                      >
                        +
                      </button>
                    </div>

                    <strong>{formatPrice(item.lineTotal)}</strong>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id, item.variantId)}
                      disabled={savingProductId === item.id || pendingRemovalIds[getCartLineKey(item.id, item.variantId)]}
                    >
                      Премахни продукта
                    </button>

                    {pendingRemovalIds[getCartLineKey(item.id, item.variantId)] && (
                      <div className="cart-remove-confirm">
                        <div>
                          <p>Сигурни ли сте, че искате да премахнете продукта от количката?</p>
                          <span className="cart-remove-timer" aria-hidden="true" />
                        </div>
                        <button type="button" onClick={() => cancelRemoveItem(item.id, item.variantId)}>
                          Отмяна
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <form className="checkout-form" onSubmit={submitCheckout}>
              <h2>Данни за поръчка</h2>

              <div className="checkout-grid">
                <label>
                  Име и фамилия
                  <input
                    name="customer_name"
                    value={customerName}
                    onChange={updateCheckoutField}
                    readOnly={isLoggedIn}
                    required={!isLoggedIn}
                  />
                </label>
                <label>
                  Имейл
                  <input
                    type="email"
                    name="customer_email"
                    value={customerEmail}
                    onChange={updateCheckoutField}
                    readOnly={isLoggedIn}
                    required={!isLoggedIn}
                  />
                </label>
                <label>
                  Телефон
                  <input
                    type="tel"
                    name="customer_phone"
                    value={customerPhone}
                    onChange={updateCheckoutField}
                    readOnly={isLoggedIn}
                    maxLength="10"
                    pattern={PHONE_PATTERN}
                    title={PHONE_ERROR}
                    required={!isLoggedIn}
                  />
                </label>
                <label>
                  Метод на доставка
                  <CustomSelect
                    name="shipping_method"
                    value={checkout.shipping_method}
                    onChange={updateCheckoutField}
                    options={shippingMethodOptions}
                  />
                </label>
                <label>
                  Град
                  <input name="shipping_city" value={checkout.shipping_city} onChange={updateCheckoutField} required />
                </label>

                {checkout.shipping_method === "address" && (
                  <>
                    <label>
                      Пощенски код
                      <input name="shipping_postcode" value={checkout.shipping_postcode} onChange={updateCheckoutField} required />
                    </label>
                    <label className="checkout-wide">
                      Адрес за доставка
                      <input name="shipping_address" value={checkout.shipping_address} onChange={updateCheckoutField} required />
                    </label>
                  </>
                )}

                {needsOffice && (
                  <label>
                    {isApmDelivery ? "Еконтомат" : "Офис"}
                    <div className="office-picker">
                      <CustomSelect
                        name="econt_office_code"
                        value={checkout.econt_office_code}
                        onChange={updateCheckoutField}
                        disabled={officeSelectDisabled}
                        options={officeOptions}
                        placeholder={officePlaceholder}
                      />
                    </div>
                  </label>
                )}

                <label className="checkout-wide">
                  Метод на плащане
                  <CustomSelect
                    name="payment_method"
                    value={checkout.payment_method}
                    onChange={updateCheckoutField}
                    options={paymentMethodOptions}
                    placeholder="--Изберете метод за плащане--"
                  />
                </label>

                <label className="checkout-wide">
                  Бележка
                  <textarea name="notes" value={checkout.notes} onChange={updateCheckoutField} />
                </label>
              </div>

              <div className="cart-summary">
                <p><span>Продукти</span><strong>{formatPrice(itemsTotal)}</strong></p>
                <p>
                  <span>Доставка</span>
                  <strong>
                    {shippingCostLoading
                      ? "Изчисляване..."
                      : shippingCostError
                        ? shippingCostError
                      : shippingCost === null
                        ? "Ще се изчисли при потвърждение"
                        : formatPrice(shippingCost)}
                  </strong>
                </p>
                <p><span>Общо</span><strong>{formatPrice(grandTotal)}</strong></p>
              </div>

              <div className="checkout-actions">
                <button type="submit" disabled={submitting}>
                  {submitting ? "Изпращане..." : "Завърши поръчката"}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}




