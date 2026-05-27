import { normalizeSearchText } from "./search";

export const EQUIPMENT_PARENT_CATEGORY_TOKENS = ["oborudvane", "equipment"];

export function isEquipmentProduct(product) {
  const categoryTokens = (product?.categories || [])
    .flatMap((category) => [category?.name, category?.slug, category?.label, category?.title])
    .map((token) => normalizeSearchText(token))
    .filter(Boolean);

  if (categoryTokens.some((token) => EQUIPMENT_PARENT_CATEGORY_TOKENS.some((parentToken) => (
    token === parentToken ||
    token.includes(parentToken) ||
    parentToken.includes(token)
  )))) {
    return true;
  }

  const haystack = [
    product?.type,
    product?.product_type,
    product?.productType,
    product?.kind,
    product?.group,
    product?.name,
    product?.slug,
    ...(product?.categories || []).map((category) => category?.name),
    ...(product?.categories || []).map((category) => category?.slug),
  ].join(" ");
  const normalizedText = normalizeSearchText(haystack);

  return normalizedText.includes("oborudvane") || normalizedText.includes("equipment");
}
