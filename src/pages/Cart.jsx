import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, getApiBaseUrl, getAuthToken, getCartSessionId, normalizeErrors } from "../api/client";
import { fetchProducts } from "../api/products";
import { getCartItemsFromResponse, responseIncludesCartItems } from "../utils/cart";
import { getPrimaryImage } from "../utils/products";
import { PHONE_ERROR, isValidPhone, normalizePhone } from "../utils/validation";
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
];
const paymentMethodPlaceholder = { value: "", label: "--Изберете метод за плащане--", disabled: true };
const fallbackPaymentMethods = [
  { value: "cod", label: "Наложен платеж" },
  { value: "bank_transfer", label: "Банков превод" },
];
const cardPaymentMethodLabel = "Плащане с карта";
const cartCachePrefix = "excompany_checkout_cart";
const REMOVE_CONFIRM_DELAY_MS = 4000;

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

function getUserFromResponse(data) {
  return data?.user || data?.data?.user || data?.data || data;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }

  return false;
}

function hasStripeEnabledKey(value) {
  const normalizedKey = String(value || "").trim().toLowerCase();
  return normalizedKey === "stripe_enabled" || normalizedKey === "stripeenabled";
}

function getSettingEntryValue(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return undefined;
  }

  const key = entry.key ?? entry.name ?? entry.setting ?? entry.code;

  if (!hasStripeEnabledKey(key)) {
    return undefined;
  }

  return entry.value ?? entry.enabled ?? entry.is_enabled ?? entry.isEnabled;
}

function normalizePaymentMethod(option) {
  if (typeof option === "string") {
    const value = option.trim();

    if (!value) {
      return null;
    }

    return {
      value,
      label: value === "stripe" ? cardPaymentMethodLabel : value,
    };
  }

  if (!option || typeof option !== "object" || Array.isArray(option)) {
    return null;
  }

  const value = String(option.value ?? option.code ?? option.key ?? "").trim();

  if (!value) {
    return null;
  }

  const label = value === "stripe"
    ? cardPaymentMethodLabel
    : String(option.label ?? option.name ?? option.title ?? "").trim() || value;

  return {
    ...option,
    value,
    label,
    disabled: normalizeBoolean(option.disabled ?? option.is_disabled ?? option.isDisabled),
  };
}

function getPaymentMethodsFromResponse(data) {
  const candidates = [
    data?.payment_methods,
    data?.paymentMethods,
    data?.settings?.payment_methods,
    data?.settings?.paymentMethods,
    data?.checkout?.payment_methods,
    data?.checkout?.paymentMethods,
    data?.payment_settings?.payment_methods,
    data?.payment_settings?.paymentMethods,
    data?.paymentSettings?.payment_methods,
    data?.paymentSettings?.paymentMethods,
    data?.data?.payment_methods,
    data?.data?.paymentMethods,
    data?.data?.settings?.payment_methods,
    data?.data?.settings?.paymentMethods,
    data?.data?.checkout?.payment_methods,
    data?.data?.checkout?.paymentMethods,
    data?.data?.payment_settings?.payment_methods,
    data?.data?.payment_settings?.paymentMethods,
    data?.data?.paymentSettings?.payment_methods,
    data?.data?.paymentSettings?.paymentMethods,
  ];

  const paymentMethods = candidates.find(Array.isArray);

  if (!paymentMethods) {
    return null;
  }

  return paymentMethods
    .map(normalizePaymentMethod)
    .filter(Boolean);
}

function getResolvedPaymentMethodsFromResponse(data) {
  const paymentMethods = getPaymentMethodsFromResponse(data);
  const stripeEnabled = getStripeEnabledFromResponse(data);

  if (paymentMethods?.length > 0) {
    if (stripeEnabled === false) {
      return paymentMethods.filter((method) => method.value !== "stripe");
    }

    return paymentMethods;
  }

  if (stripeEnabled !== null) {
    return stripeEnabled
      ? [...fallbackPaymentMethods, { value: "stripe", label: cardPaymentMethodLabel }]
      : fallbackPaymentMethods;
  }

  return null;
}

function normalizeOfficeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getOfficeClassification(office) {
  const explicitCandidates = [
    office?.is_aps,
    office?.isAPS,
    office?.isApm,
    office?.is_apm,
    office?.aps,
    office?.apm,
    office?.is_automated,
    office?.isAutomated,
    office?.automatic,
  ];
  const explicitValue = explicitCandidates.find((candidate) => candidate !== null && typeof candidate !== "undefined" && candidate !== "");

  if (typeof explicitValue !== "undefined") {
    return normalizeBoolean(explicitValue);
  }

  const descriptiveTokens = [
    office?.type,
    office?.office_type,
    office?.officeType,
    office?.type_name,
    office?.typeName,
    office?.office_type_name,
    office?.officeTypeName,
    office?.subtype,
    office?.sub_type,
    office?.subType,
    office?.kind,
    office?.office_kind,
    office?.officeKind,
    office?.category,
    office?.category_name,
    office?.categoryName,
    office?.description,
    office?.office_description,
    office?.officeDescription,
    office?.name,
  ]
    .map(normalizeOfficeText)
    .filter(Boolean);

  if (descriptiveTokens.some((token) => (
    token.includes("aps") ||
    token.includes("apm") ||
    token.includes("econtomat") ||
    token.includes("ekontomat") ||
    token.includes("еконтомат") ||
    token.includes("automat") ||
    token.includes("автомат") ||
    token.includes("locker") ||
    token.includes("machine")
  ))) {
    return true;
  }

  if (descriptiveTokens.some((token) => (
    token.includes("office") ||
    token.includes("офис")
  ))) {
    return false;
  }

  return null;
}

function getOfficesFromResponse(data) {
  const candidates = [
    data?.offices,
    data?.data?.offices,
    data?.data?.items,
    data?.items,
    data?.results,
    data?.data?.results,
    data?.data,
    data,
  ];

  return candidates.find(Array.isArray) || [];
}

function normalizeOffice(office) {
  const code = (
    office?.code ??
    office?.office_code ??
    office?.officeCode ??
    office?.id ??
    office?.office_id ??
    office?.officeId ??
    ""
  );

  return {
    ...office,
    code: String(code || ""),
    name: (
      office?.name ??
      office?.office_name ??
      office?.officeName ??
      office?.label ??
      office?.title ??
      ""
    ),
    address: (
      office?.address ??
      office?.office_address ??
      office?.officeAddress ??
      office?.address_full ??
      office?.addressFull ??
      office?.full_address ??
      office?.fullAddress ??
      ""
    ),
    is_aps: getOfficeClassification(office),
  };
}

function normalizeOfficesResponse(data) {
  return getOfficesFromResponse(data)
    .map(normalizeOffice)
    .filter((office) => office.code && office.name);
}

function getStripeEnabledFromResponse(data) {
  const candidates = [
    data?.stripe_enabled,
    data?.stripeEnabled,
    data?.settings?.stripe_enabled,
    data?.settings?.stripeEnabled,
    data?.settings?.stripe?.enabled,
    data?.checkout?.stripe_enabled,
    data?.checkout?.stripeEnabled,
    data?.checkout?.stripe?.enabled,
    data?.payment_settings?.stripe_enabled,
    data?.payment_settings?.stripeEnabled,
    data?.payment_settings?.stripe?.enabled,
    data?.paymentSettings?.stripe_enabled,
    data?.paymentSettings?.stripeEnabled,
    data?.paymentSettings?.stripe?.enabled,
    data?.stripe?.enabled,
    data?.payments?.stripe?.enabled,
    data?.payment_methods?.stripe?.enabled,
    data?.paymentMethods?.stripe?.enabled,
    data?.data?.stripe_enabled,
    data?.data?.stripeEnabled,
    data?.data?.settings?.stripe_enabled,
    data?.data?.settings?.stripeEnabled,
    data?.data?.settings?.stripe?.enabled,
    data?.data?.checkout?.stripe_enabled,
    data?.data?.checkout?.stripeEnabled,
    data?.data?.checkout?.stripe?.enabled,
    data?.data?.payment_settings?.stripe_enabled,
    data?.data?.payment_settings?.stripeEnabled,
    data?.data?.payment_settings?.stripe?.enabled,
    data?.data?.paymentSettings?.stripe_enabled,
    data?.data?.paymentSettings?.stripeEnabled,
    data?.data?.paymentSettings?.stripe?.enabled,
    data?.data?.stripe?.enabled,
    data?.data?.payments?.stripe?.enabled,
    data?.data?.payment_methods?.stripe?.enabled,
    data?.data?.paymentMethods?.stripe?.enabled,
  ];
  const settingEntries = [
    data?.settings,
    data?.payment_settings,
    data?.paymentSettings,
    data?.data?.settings,
    data?.data?.payment_settings,
    data?.data?.paymentSettings,
    data?.data,
    data,
  ]
    .filter(Array.isArray)
    .flat();
  const settingEntryObjects = [
    data?.settings,
    data?.payment_settings,
    data?.paymentSettings,
    data?.data?.settings,
    data?.data?.payment_settings,
    data?.data?.paymentSettings,
    data?.data,
    data,
  ].filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
  const settingEntryValue = settingEntries
    .concat(settingEntryObjects)
    .map(getSettingEntryValue)
    .find((candidate) => candidate !== undefined && candidate !== null);

  const value = candidates.find((candidate) => candidate !== undefined && candidate !== null) ?? settingEntryValue;
  return value === undefined ? null : normalizeBoolean(value);
}

async function fetchCheckoutSettings() {
  const endpoints = ["/api/checkout/payment-methods", "/api/checkout/settings", "/api/settings"];

  for (const endpoint of endpoints) {
    try {
      const data = await apiRequest(endpoint);
      const paymentMethods = getResolvedPaymentMethodsFromResponse(data);

      if (paymentMethods !== null) {
        return { paymentMethods };
      }
    } catch {
      // Try the next known checkout endpoint before falling back to local config.
    }
  }

  return { paymentMethods: fallbackPaymentMethods };
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

function hasVariantId(value) {
  return value !== null && typeof value !== "undefined" && value !== "";
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
  const items = getCartItemsFromResponse(cartData);

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
      variantId: item.product_variant_id ?? variant.id ?? null,
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

function hasPositiveCartPrice(item) {
  const price = Number(item?.price);
  const lineTotal = Number(item?.lineTotal);

  return Number.isFinite(price) && price > 0 && Number.isFinite(lineTotal) && lineTotal > 0;
}

function toSafeString(value) {
  return typeof value === "string" ? value : "";
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
      paymentMethods: Array.isArray(parsed.paymentMethods) ? parsed.paymentMethods : [],
    };
  } catch {
    return null;
  }
}

function writeCartCache(snapshot) {
  try {
    localStorage.setItem(getCartCacheKey(), JSON.stringify({
      items: Array.isArray(snapshot?.items) ? snapshot.items : [],
      paymentMethods: Array.isArray(snapshot?.paymentMethods) ? snapshot.paymentMethods : [],
      updatedAt: Date.now(),
    }));
  } catch {
    // Ignore storage failures and keep the live cart state in memory.
  }
}

export default function Cart() {
  const [cachedCart] = useState(() => readCartCache());
  const [items, setItems] = useState(() => cachedCart?.items || []);
  const [checkout, setCheckout] = useState(initialCheckout);
  const [offices, setOffices] = useState([]);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [loading, setLoading] = useState(() => !cachedCart);
  const [savingProductId, setSavingProductId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [shippingCost, setShippingCost] = useState(null);
  const [shippingCostLoading, setShippingCostLoading] = useState(false);
  const [shippingCostError, setShippingCostError] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState(() => cachedCart?.paymentMethods || []);
  const productLookupRef = useRef(null);
  const removeTimersRef = useRef({});
  const [pendingRemovals, setPendingRemovals] = useState({});

  const activeShippingMethod = checkout.shipping_method === "apm" ? "office" : checkout.shipping_method;
  const isOfficeDelivery = activeShippingMethod === "office";
  const isApmDelivery = false;
  const needsOffice = isOfficeDelivery;
  const isLoggedIn = Boolean(user);
  const customerName = isLoggedIn ? getUserName(user) : checkout.customer_name;
  const customerEmail = isLoggedIn ? getUserEmail(user) : checkout.customer_email;
  const customerPhone = isLoggedIn ? getUserPhone(user) : checkout.customer_phone;

  const itemsTotal = useMemo(
    () => items.reduce((total, item) => total + item.lineTotal, 0),
    [items],
  );
  const unpricedItems = useMemo(
    () => items.filter((item) => !hasPositiveCartPrice(item)),
    [items],
  );

  const checkoutItems = useMemo(
    () => items.map((item) => ({
      product_id: item.id,
      ...(hasVariantId(item.variantId) ? { product_variant_id: item.variantId } : {}),
      quantity: item.quantity,
    })),
    [items],
  );
  const shippingCalculationItems = useMemo(
    () => items.map((item) => ({
      product_id: item.id,
      variant_id: hasVariantId(item.variantId) ? item.variantId : null,
      quantity: item.quantity,
    })),
    [items],
  );

  useEffect(() => (
    () => {
      Object.values(removeTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      removeTimersRef.current = {};
    }
  ), []);

  useEffect(() => {
    const activeKeys = new Set(items.map((item) => getCartLineKey(item.id, item.variantId)));
    const staleKeys = Object.keys(removeTimersRef.current).filter((key) => !activeKeys.has(key));

    if (staleKeys.length === 0) {
      return;
    }

    staleKeys.forEach((key) => {
      window.clearTimeout(removeTimersRef.current[key]);
      delete removeTimersRef.current[key];
    });

    setPendingRemovals((current) => {
      const nextPendingRemovals = { ...current };
      staleKeys.forEach((key) => {
        delete nextPendingRemovals[key];
      });
      return nextPendingRemovals;
    });
  }, [items]);

  const filteredOffices = useMemo(() => {
    const apsOffices = offices.filter((office) => office.is_aps === true);
    const nonApsOffices = offices.filter((office) => office.is_aps === false);
    const unknownTypeOffices = offices.filter((office) => office.is_aps === null);

    if (isApmDelivery) {
      return apsOffices.length > 0 ? apsOffices : [...apsOffices, ...unknownTypeOffices];
    }

    return nonApsOffices.length > 0 ? nonApsOffices : [...nonApsOffices, ...unknownTypeOffices];
  }, [offices, isApmDelivery]);
  const officePlaceholder = !checkout.shipping_city.trim()
    ? "--Изберете град, за да се заредят офисите--"
    : officesLoading
      ? "Зареждане..."
      : filteredOffices.length === 0
        ? isApmDelivery
          ? "--Няма намерени еконтомати--"
          : "--Няма намерени офиси--"
        : isApmDelivery
          ? "--Изберете еконтомат--"
          : "--Изберете офис--";
  const officeSelectDisabled = !checkout.shipping_city.trim() || officesLoading || filteredOffices.length === 0;
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
  const paymentMethodOptions = useMemo(
    () => [
      paymentMethodPlaceholder,
      ...(paymentMethods.length > 0 ? paymentMethods : fallbackPaymentMethods),
    ],
    [paymentMethods],
  );
  const selectedPaymentMethod = paymentMethodOptions.some((option) => String(option.value) === String(checkout.payment_method))
    ? checkout.payment_method
    : "";
  const stripeEnabled = paymentMethodOptions.some((option) => String(option.value) === "stripe");
  const grandTotal = itemsTotal + (shippingCost ?? 0);

  const emptyOfficeSnapshot = {
    econt_office_code: "",
    econt_office_name: "",
    econt_office_address: "",
    econt_office_is_aps: false,
  };

  const getProductLookup = useCallback(async () => {
    if (!productLookupRef.current) {
      productLookupRef.current = await fetchProductLookup();
    }

    return productLookupRef.current;
  }, []);

  const getProductLookupForCart = useCallback(async (cartData) => {
    return cartNeedsProductLookup(cartData) ? await getProductLookup() : {};
  }, [getProductLookup]);

  const refreshPaymentMethods = useCallback(async () => {
    try {
      const settings = await fetchCheckoutSettings();

      if (settings) {
        setPaymentMethods(settings.paymentMethods);
      }
    } catch {
      // Keep the last known payment methods if the checkout settings request fails.
    }
  }, []);

  async function syncCartItems() {
    const cartData = await apiRequest("/api/cart");
    const lookup = await getProductLookupForCart(cartData);
    setItems(normalizeCartItems(cartData, lookup));
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialCart() {
      setMessages([]);

      try {
        const cartData = await apiRequest("/api/cart");
        const lookup = await getProductLookupForCart(cartData);
        const cartPaymentMethods = getResolvedPaymentMethodsFromResponse(cartData);

        if (!isCancelled) {
          setItems(normalizeCartItems(cartData, lookup));
          if (cartPaymentMethods?.length > 0) {
            setPaymentMethods(cartPaymentMethods);
          }
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
  }, [getProductLookupForCart]);

  useEffect(() => {
    writeCartCache({ items, paymentMethods });
  }, [items, paymentMethods]);

  useEffect(() => {
    refreshPaymentMethods();

    const intervalId = window.setInterval(refreshPaymentMethods, 3000);

    function handleFocus() {
      if (document.visibilityState === "visible") {
        refreshPaymentMethods();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [refreshPaymentMethods]);

  useEffect(() => {
    if (!checkout.payment_method) {
      return;
    }

    if (paymentMethodOptions.some((option) => String(option.value) === String(checkout.payment_method))) {
      return;
    }

    setCheckout((current) => ({
      ...current,
      payment_method: "",
    }));
  }, [paymentMethodOptions, checkout.payment_method]);

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
          setOffices(normalizeOfficesResponse(data));
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
      const isOffice = activeShippingMethod === "office";
      const isAddress = activeShippingMethod === "address";
      const hasOfficeData = city && Boolean(selectedOffice);
      const hasAddressData = city && toSafeString(checkout.shipping_postcode).trim() && toSafeString(checkout.shipping_address).trim();
      const hasPaymentMethod = selectedPaymentMethod.trim().length > 0;

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
          shipping_method: activeShippingMethod,
          shipping_city: city,
          payment_method: selectedPaymentMethod,
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
      } catch {
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
    activeShippingMethod,
    checkout.shipping_method,
    checkout.shipping_city,
    checkout.shipping_postcode,
    checkout.shipping_address,
    checkout.econt_office_code,
    selectedPaymentMethod,
    shippingCalculationItems,
    selectedOffice,
  ]);

  function updateCheckoutField(event) {
    const { name, value } = event.target;
    const normalizedValue = name === "shipping_method" && value === "apm" ? "office" : value;

    setCheckout((current) => ({
      ...current,
      [name]: normalizedValue,
      ...(name === "shipping_method" && normalizedValue === "office"
        ? { shipping_address: "", shipping_postcode: "", ...emptyOfficeSnapshot }
        : {}),
      ...(name === "shipping_method" && normalizedValue === "address"
        ? { ...emptyOfficeSnapshot }
        : {}),
      ...(name === "shipping_city" ? { ...emptyOfficeSnapshot } : {}),
    }));
    setMessages([]);
  }

  async function updateQuantity(productId, quantity, variantId = null) {
    clearPendingRemoval(getCartLineKey(productId, variantId));

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
          ...(hasVariantId(variantId) ? { product_variant_id: variantId } : {}),
        }),
      });

      if (responseIncludesCartItems(data)) {
        const lookup = await getProductLookupForCart(data);
        setItems(normalizeCartItems(data, lookup));
      } else {
        setItems((currentItems) => currentItems.map((item) => (
          item.id === productId && String(item.variantId || "") === String(variantId || "")
            ? { ...item, quantity: nextQuantity, lineTotal: item.price * nextQuantity }
            : item
        )));
        await syncCartItems();
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
    setSavingProductId(productId);
    setMessages([]);

    try {
      const query = hasVariantId(variantId) ? `?product_variant_id=${encodeURIComponent(variantId)}` : "";
      const data = await apiRequest(`/api/cart/delete/${productId}${query}`, {
        method: "DELETE",
      });

      if (responseIncludesCartItems(data)) {
        const lookup = await getProductLookupForCart(data);
        setItems(normalizeCartItems(data, lookup));
      } else {
        await syncCartItems();
      }

      window.dispatchEvent(new Event("cart:changed"));
    } catch (error) {
      setMessages(normalizeErrors(error));
      try {
        await syncCartItems();
      } catch {
        // Keep the remove error visible even if refresh fails.
      }
    } finally {
      setSavingProductId(null);
    }
  }

  function getCartLineKey(productId, variantId = null) {
    return `${productId}:${variantId || ""}`;
  }

  function clearPendingRemoval(key) {
    if (removeTimersRef.current[key]) {
      window.clearTimeout(removeTimersRef.current[key]);
      delete removeTimersRef.current[key];
    }

    setPendingRemovals((current) => {
      if (!current[key]) {
        return current;
      }

      const nextPendingRemovals = { ...current };
      delete nextPendingRemovals[key];
      return nextPendingRemovals;
    });
  }

  function clearAllPendingRemovals() {
    Object.values(removeTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    removeTimersRef.current = {};
    setPendingRemovals({});
  }

  function scheduleRemoveItem(productId, variantId = null) {
    const key = getCartLineKey(productId, variantId);

    if (removeTimersRef.current[key]) {
      return;
    }

    setMessages([]);
    setPendingRemovals((current) => ({
      ...current,
      [key]: true,
    }));

    removeTimersRef.current[key] = window.setTimeout(() => {
      delete removeTimersRef.current[key];
      setPendingRemovals((current) => {
        if (!current[key]) {
          return current;
        }

        const nextPendingRemovals = { ...current };
        delete nextPendingRemovals[key];
        return nextPendingRemovals;
      });
      performRemoveItem(productId, variantId);
    }, REMOVE_CONFIRM_DELAY_MS);
  }

  function removeItem(productId, variantId = null) {
    scheduleRemoveItem(productId, variantId);
  }

  function buildCheckoutPayload() {
    const isAddressDelivery = activeShippingMethod === "address";
    const payload = {
      session_id: getCartSessionId(),
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: normalizePhone(customerPhone),
      shipping_method: activeShippingMethod,
      shipping_city: checkout.shipping_city.trim(),
      payment_method: selectedPaymentMethod,
      locale: "bg",
      notes: checkout.notes.trim(),
      items: checkoutItems,
    };

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

    if (activeShippingMethod === "address") {
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

    if (!selectedPaymentMethod) {
      errors.push("Изберете метод на плащане.");
    } else if (selectedPaymentMethod === "stripe" && !stripeEnabled) {
      errors.push("Плащането с карта временно не е налично.");
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

    unpricedItems.forEach((item) => {
      const variantLabel = item.variantSize ? ` (${item.variantSize})` : "";
      errors.push(`${item.name}${variantLabel} няма въведена цена и не може да бъде поръчан.`);
    });

    if (isLoggedIn && errors.includes(PHONE_ERROR)) {
      errors.push("Телефонът е заключен към профила. Обновете данните в профила си преди поръчка.");
    }

    return errors;
  }

  async function submitCheckout(event) {
    event.preventDefault();
    clearAllPendingRemovals();
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
              </div>

              <div className="cart-items">
                {items.map((item) => (
                  <article className="cart-item" key={getCartLineKey(item.id, item.variantId)}>
                    <div className="cart-product-info">
                      <div className="cart-product-thumb">
                        {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <span>{item.name.charAt(0)}</span>}
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
                      className="cart-remove-button"
                      onClick={() => removeItem(item.id, item.variantId)}
                      disabled={savingProductId === item.id || Boolean(pendingRemovals[getCartLineKey(item.id, item.variantId)])}
                      aria-label={`Премахни ${item.name} от количката`}
                      title="Премахни продукта"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h16" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M6 7l1 14h10l1-14" />
                        <path d="M9 7V4h6v3" />
                      </svg>
                    </button>

                    {pendingRemovals[getCartLineKey(item.id, item.variantId)] && (
                      <div className="cart-remove-confirm" role="status" aria-live="polite">
                        <div>
                          <p>Сигурни ли сте, че искате да премахнете продукта от количката?</p>
                          <span className="cart-remove-timer" aria-hidden="true" />
                        </div>
                        <button
                          type="button"
                          onClick={() => clearPendingRemoval(getCartLineKey(item.id, item.variantId))}
                        >
                          Отмяна
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <form className="checkout-form" onSubmit={submitCheckout} noValidate>
              <h2>Данни за поръчка</h2>

              <div className="checkout-grid">
                <label>
                  Име и фамилия
                  <input
                    name="customer_name"
                    value={customerName}
                    onChange={updateCheckoutField}
                    readOnly={isLoggedIn}
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
                    title={PHONE_ERROR}
                  />
                </label>
                <label>
                  Град
                  <input name="shipping_city" value={checkout.shipping_city} onChange={updateCheckoutField} />
                </label>
                <label>
                  Метод на доставка
                  <CustomSelect
                    name="shipping_method"
                    value={activeShippingMethod}
                    onChange={updateCheckoutField}
                    options={shippingMethodOptions}
                  />
                </label>

                {activeShippingMethod === "address" && (
                  <>
                    <label>
                      Пощенски код
                      <input name="shipping_postcode" value={checkout.shipping_postcode} onChange={updateCheckoutField} />
                    </label>
                    <label className="checkout-wide">
                      Адрес за доставка
                      <input name="shipping_address" value={checkout.shipping_address} onChange={updateCheckoutField} />
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
                    value={selectedPaymentMethod}
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




