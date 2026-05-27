export const PRODUCT_PAGE_SIZE_OPTIONS = [30, 60, 90];
export const DEFAULT_PRODUCT_PAGE_SIZE = 30;

export function getPageSizeFromSearch() {
  const rawPageSize = Number.parseInt(new URLSearchParams(window.location.search).get("per_page") || "", 10);

  return PRODUCT_PAGE_SIZE_OPTIONS.includes(rawPageSize) ? rawPageSize : DEFAULT_PRODUCT_PAGE_SIZE;
}
