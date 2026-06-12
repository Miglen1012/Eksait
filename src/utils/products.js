import { collectLocalizedValues, getLocalizedText, normalizeLanguageCode } from "./localized";
import { getStoredLanguage } from "./language";
import { normalizeSearchText } from "./search";
import { categories, getCategoryTokens } from "../data/categories";

const PRODUCT_NAME_KEYS = ["name", "title", "product_name", "productName"];
const PRODUCT_DESCRIPTION_KEYS = ["description", "short_description", "shortDescription", "content", "body"];
const PRODUCT_EXTRA_INFO_KEYS = ["extra_information", "extraInformation", "additional_information", "additionalInformation"];
const CATEGORY_NAME_KEYS = ["name", "label", "title", "category_name", "categoryName"];
const MATERIAL_KEYS = [
  "material",
  "material_type",
  "materialType",
  "material_name",
  "materialName",
  "attribute_material",
];
const VARIANT_SIZE_KEYS = ["size", "name", "label", "title"];
const localeByLanguage = {
  bg: "bg-BG",
  en: "en-US",
  de: "de-DE",
};
const knownCategoryTokens = Object.fromEntries(
  categories.map((category) => [category.slug, getCategoryTokens(category)]),
);

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

function getAttributeValue(source = {}, keys = []) {
  const attributes = source.attributes || source.product_attributes || source.productAttributes;

  if (!attributes) {
    return "";
  }

  if (Array.isArray(attributes)) {
    const match = attributes.find((attribute) => {
      const attributeName = String(attribute?.name || attribute?.key || attribute?.label || "").trim().toLowerCase();
      return keys.includes(attributeName);
    });

    return match?.value || match?.values?.[0] || "";
  }

  if (typeof attributes === "object") {
    const matchingKey = Object.keys(attributes).find((key) => keys.includes(key.trim().toLowerCase()));
    return matchingKey ? attributes[matchingKey] : "";
  }

  return "";
}

function getKnownCategorySlug(category = {}) {
  const categoryTokens = [
    category.slug,
    category.category_slug,
    category.categorySlug,
    category.name,
    category.label,
    category.title,
    category.category_name,
    category.categoryName,
    ...collectLocalizedValues(category, CATEGORY_NAME_KEYS),
  ]
    .map((token) => normalizeSearchText(token))
    .filter(Boolean);

  for (const [slug, aliases] of Object.entries(knownCategoryTokens)) {
    const normalizedAliases = aliases.map((alias) => normalizeSearchText(alias));

    if (categoryTokens.some((token) => (
      token === slug ||
      normalizedAliases.includes(token) ||
      normalizedAliases.some((alias) => token.includes(alias) || alias.includes(token))
    ))) {
      return slug;
    }
  }

  return "";
}

function normalizeMaterial(source = {}, language) {
  const material = (
    getLocalizedText(source, MATERIAL_KEYS, language) ||
    getAttributeValue(source, ["material", "материал", "вид материал"])
  );

  return String(material || "").trim();
}

function normalizeCategory(category, language) {
  if (!category) {
    return null;
  }

  if (typeof category === "string") {
    const slug = getKnownCategorySlug({ name: category });
    return {
      name: category,
      slug,
    };
  }

  const rawName = getLocalizedText(category, CATEGORY_NAME_KEYS, language);
  const slug = category.slug || category.category_slug || category.categorySlug || "";
  const knownSlug = getKnownCategorySlug({ ...category, name: rawName, slug });
  const name = rawName;

  if (!name && !slug && !knownSlug) {
    return null;
  }

  return {
    ...category,
    name: name || slug || knownSlug,
    slug: knownSlug || slug,
  };
}

function normalizeCategories(product = {}, language) {
  const rawCategories = product.categories || product.product_categories || product.productCategories;

  if (Array.isArray(rawCategories)) {
    return rawCategories.map((category) => normalizeCategory(category, language)).filter(Boolean);
  }

  const singleCategory =
    product.category ||
    product.category_name ||
    product.categoryName ||
    product.category_label ||
    product.categoryLabel;

  const normalizedCategory = normalizeCategory(singleCategory, language);

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

export function getProductCategoryLabel(product, fallback = "Product") {
  return product?.categories?.find((category) => category?.name)?.name || fallback;
}

function getProductFallbackName(id, language) {
  const fallbackByLanguage = {
    bg: "Продукт",
    en: "Product",
    de: "Produkt",
  };
  const label = fallbackByLanguage[normalizeLanguageCode(language)] || fallbackByLanguage.bg;

  return `${label} #${id}`;
}

function normalizeVariant(variant, language) {
  const quantity = normalizeQuantity(variant);
  const size = getLocalizedText(variant, VARIANT_SIZE_KEYS, language);

  return {
    id: variant.id,
    productId: variant.product_id ?? variant.productId ?? variant.product?.id ?? null,
    relatedProductId: variant.related_product_id ?? variant.relatedProductId ?? variant.related_product?.id ?? variant.relatedProduct?.id ?? null,
    size,
    price: toNumber(variant.sale_price ?? variant.price, 0),
    regularPrice: toNumber(variant.price, 0),
    stock: normalizeStock(variant) || (quantity !== null && quantity > 0),
    quantity,
    weight: variant.weight ?? null,
    dimensions: normalizeDimensions(variant),
  };
}

function normalizeProduct(product, includeRelated = true, language = "bg") {
  const normalizedLanguage = normalizeLanguageCode(language);
  const name = getLocalizedText(product, PRODUCT_NAME_KEYS, normalizedLanguage, product.name || getProductFallbackName(product.id, normalizedLanguage));
  const variants = Array.isArray(product.variants)
    ? product.variants.map((variant) => normalizeVariant(variant, normalizedLanguage))
    : [];
  const quantity = normalizeQuantity(product);
  const categories = normalizeCategories(product, normalizedLanguage);
  const description = getLocalizedText(product, PRODUCT_DESCRIPTION_KEYS, normalizedLanguage);
  const plainDescription = stripHtml(description);
  const extraInformation = getLocalizedText(product, PRODUCT_EXTRA_INFO_KEYS, normalizedLanguage);
  const material = normalizeMaterial(product, normalizedLanguage);
  const categoryNames = categories.map((category) => category?.name).filter(Boolean).join(", ");
  const searchText = normalizeSearchText([
    name,
    product.slug,
    material,
    plainDescription,
    ...categories.map((category) => category?.name),
    ...variants.map((variant) => variant?.size),
    ...collectLocalizedValues(product, [
      ...PRODUCT_NAME_KEYS,
      ...PRODUCT_DESCRIPTION_KEYS,
      ...PRODUCT_EXTRA_INFO_KEYS,
      ...MATERIAL_KEYS,
    ]),
    ...categories.flatMap((category) => collectLocalizedValues(category, CATEGORY_NAME_KEYS)),
    ...variants.flatMap((variant) => collectLocalizedValues(variant, VARIANT_SIZE_KEYS)),
  ].filter(Boolean).join(" "));

  return {
    id: product.id,
    name,
    slug: product.slug || "",
    description,
    plainDescription,
    extraInformation,
    price: toNumber(product.sale_price ?? product.price, 0),
    regularPrice: toNumber(product.price, 0),
    stock: normalizeStock(product) || (quantity !== null && quantity > 0),
    quantity,
    weight: product.weight ?? null,
    dimensions: normalizeDimensions(product),
    material,
    variants,
    hasVariants: variants.length > 0,
    categories,
    categoryNames,
    searchText,
    images: Array.isArray(product.images) ? product.images : [],
    image: product.image_url || product.primary_image_url || product.thumbnail_url || getPrimaryImage(product.images || []) || product.image || "",
    relatedProducts: includeRelated
      ? getRelatedProducts(product).map((relatedProduct) => normalizeProduct(relatedProduct, false, normalizedLanguage))
      : [],
  };
}

export function normalizeProducts(data, options = {}) {
  const language = normalizeLanguageCode(typeof options === "string" ? options : options.language);
  const products = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
        ? data
        : data?.id || data?.slug || data?.name
          ? [data]
          : data?.data?.id || data?.data?.slug || data?.data?.name
            ? [data.data]
            : [];

  return products.map((product) => normalizeProduct(product, true, language));
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

export function formatPrice(value, language = getStoredLanguage()) {
  const locale = localeByLanguage[normalizeLanguageCode(language)] || localeByLanguage.bg;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(toNumber(value, 0));
}
