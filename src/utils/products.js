function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(...values) {
  const value = values.find((item) => item !== null && typeof item !== "undefined" && item !== "");

  if (typeof value === "undefined") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "available", "in_stock", "in stock", "в наличност"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "unavailable", "out_of_stock", "out of stock", "изчерпан"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function normalizeStock(source = {}) {
  return toBoolean(
    source.stock ??
    source.in_stock ??
    source.is_in_stock ??
    source.available ??
    source.is_available ??
    source.availability,
    false,
  );
}

function normalizeQuantity(source = {}) {
  return toOptionalNumber(source.quantity, source.stock_quantity, source.available_quantity);
}

function isPurchasable(stock, quantity) {
  return Boolean(stock) && (quantity === null || quantity > 0);
}

function normalizeDimensions(source = {}) {
  return {
    width: source.width ?? source.dimension_width ?? null,
    height: source.height ?? source.dimension_height ?? null,
    length: source.length ?? source.dimension_length ?? null,
  };
}

function normalizeCategory(category) {
  if (!category) {
    return null;
  }

  if (typeof category === "string") {
    return { name: category, slug: "" };
  }

  const name = category.name || category.label || category.title || category.category_name || category.categoryName || "";
  const slug = category.slug || category.category_slug || category.categorySlug || "";

  if (!name && !slug) {
    return null;
  }

  return {
    ...category,
    name: name || slug,
    slug,
  };
}

function normalizeCategories(product = {}) {
  const rawCategories = product.categories || product.product_categories || product.productCategories;

  if (Array.isArray(rawCategories)) {
    return rawCategories.map(normalizeCategory).filter(Boolean);
  }

  const singleCategory =
    product.category ||
    product.category_name ||
    product.categoryName ||
    product.category_label ||
    product.categoryLabel;

  const normalizedCategory = normalizeCategory(singleCategory);

  return normalizedCategory ? [normalizedCategory] : [];
}

function getRelatedProducts(product) {
  const related =
    product?.related_products ??
    product?.relatedProducts ??
    product?.related ??
    product?.similar_products ??
    product?.similarProducts ??
    product?.recommended_products ??
    product?.recommendedProducts ??
    [];

  return Array.isArray(related) ? related : [];
}

export function hasProductVariants(product) {
  return Array.isArray(product?.variants) && product.variants.length > 0;
}

export function isVariantAvailable(variant) {
  return isPurchasable(variant?.stock, variant?.quantity ?? null);
}

export function isProductAvailableForPurchase(product) {
  if (hasProductVariants(product)) {
    return product.variants.some((variant) => isVariantAvailable(variant));
  }

  return isPurchasable(product?.stock, product?.quantity ?? null);
}

export function getPrimaryImage(images = []) {
  const primary = images.find((image) => image.is_primary);
  const sorted = [...images].sort((a, b) => toNumber(a.sort_order) - toNumber(b.sort_order));
  return primary?.url || primary?.image_url || primary?.image_path || sorted[0]?.url || sorted[0]?.image_url || sorted[0]?.image_path || "";
}

export function getProductCategoryLabel(product, fallback = "Продукт") {
  return product?.categories?.find((category) => category?.name)?.name || fallback;
}

function normalizeVariant(variant) {
  const quantity = normalizeQuantity(variant);

  return {
    id: variant.id,
    size: variant.size || variant.name || "",
    price: toNumber(variant.sale_price ?? variant.price, 0),
    regularPrice: toNumber(variant.price, 0),
    stock: normalizeStock(variant) || (quantity !== null && quantity > 0),
    quantity,
    weight: variant.weight ?? null,
    dimensions: normalizeDimensions(variant),
  };
}

function normalizeProduct(product, includeRelated = true) {
  const variants = Array.isArray(product.variants) ? product.variants.map(normalizeVariant) : [];
  const quantity = normalizeQuantity(product);

  return {
    id: product.id,
    name: product.name || `Продукт #${product.id}`,
    slug: product.slug || "",
    description: product.description || "",
    extraInformation: product.extra_information || "",
    price: toNumber(product.sale_price ?? product.price, 0),
    regularPrice: toNumber(product.price, 0),
    stock: normalizeStock(product) || (quantity !== null && quantity > 0),
    quantity,
    weight: product.weight ?? null,
    dimensions: normalizeDimensions(product),
    variants,
    hasVariants: variants.length > 0,
    categories: normalizeCategories(product),
    images: Array.isArray(product.images) ? product.images : [],
    image: product.image_url || product.primary_image_url || product.thumbnail_url || getPrimaryImage(product.images || []) || product.image || "",
    relatedProducts: includeRelated
      ? getRelatedProducts(product).map((relatedProduct) => normalizeProduct(relatedProduct, false))
      : [],
  };
}

export function normalizeProducts(data) {
  const products = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
        ? data
        : [];

  return products.map((product) => normalizeProduct(product));
}

export function getSelectedVariant(product, variantId) {
  if (!hasProductVariants(product)) {
    return null;
  }

  return product.variants.find((variant) => String(variant.id) === String(variantId)) || null;
}

export function getPurchasableState(product, variantId) {
  const variant = getSelectedVariant(product, variantId);

  if (hasProductVariants(product)) {
    return {
      mode: "variant",
      price: variant?.price || 0,
      stock: Boolean(variant?.stock),
      quantity: variant?.quantity ?? null,
      weight: variant?.weight ?? product?.weight ?? null,
      dimensions: variant?.dimensions || product?.dimensions || null,
      variant,
      needsVariant: !variant,
      isAvailable: isVariantAvailable(variant),
    };
  }

  return {
    mode: "product",
    price: product?.price || 0,
    stock: Boolean(product?.stock),
    quantity: product?.quantity ?? null,
    weight: product?.weight ?? null,
    dimensions: product?.dimensions || null,
    variant: null,
    needsVariant: false,
    isAvailable: isPurchasable(product?.stock, product?.quantity ?? null),
  };
}

export function stripHtml(value) {
  return String(value || "")
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatPrice(value) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
  }).format(toNumber(value, 0));
}
