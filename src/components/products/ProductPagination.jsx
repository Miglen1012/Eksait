import CustomSelect from "../form/CustomSelect";
import { DEFAULT_PRODUCT_PAGE_SIZE, PRODUCT_PAGE_SIZE_OPTIONS } from "../../utils/pagination";

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 4) {
    [2, 3, 4, 5].forEach((page) => pages.add(page));
  }

  if (currentPage >= totalPages - 3) {
    [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1].forEach((page) => pages.add(page));
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((firstPage, secondPage) => firstPage - secondPage);

  return sortedPages.reduce((items, page, index) => {
    const previousPage = sortedPages[index - 1];

    if (index > 0 && page - previousPage > 1) {
      items.push(`ellipsis-${previousPage}-${page}`);
    }

    items.push(page);
    return items;
  }, []);
}

const pageSizeOptions = PRODUCT_PAGE_SIZE_OPTIONS.map((size) => ({
  value: size,
  label: String(size),
}));

export function ProductPageSizeSelect({ onPageSizeChange, pageSize }) {
  return (
    <label className="products-page-size">
      <span>На страница</span>
      <CustomSelect
        ariaLabel="Брой продукти на страница"
        value={pageSize}
        onChange={(value) => onPageSizeChange(Number(value))}
        options={pageSizeOptions}
        placeholder={String(DEFAULT_PRODUCT_PAGE_SIZE)}
      />
    </label>
  );
}

export default function ProductPagination({
  currentPage,
  onPageChange,
  totalPages,
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);
  const paginationItems = getPaginationItems(safeCurrentPage, safeTotalPages);

  return (
    <div className="products-pagination-bar">
      {safeTotalPages > 1 && (
        <nav className="products-pagination" aria-label="Страници">
          <button
            type="button"
            className="products-pagination-button"
            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            disabled={safeCurrentPage === 1}
          >
            Назад
          </button>

          <div className="products-pagination-pages">
            {paginationItems.map((item) => (
              typeof item === "number" ? (
                <button
                  type="button"
                  key={item}
                  className={item === safeCurrentPage ? "products-page-number is-active" : "products-page-number"}
                  onClick={() => onPageChange(item)}
                  aria-current={item === safeCurrentPage ? "page" : undefined}
                >
                  {item}
                </button>
              ) : (
                <span className="products-page-ellipsis" key={item} aria-hidden="true">
                  ...
                </span>
              )
            ))}
          </div>

          <button
            type="button"
            className="products-pagination-button"
            onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
            disabled={safeCurrentPage === safeTotalPages}
          >
            Напред
          </button>
        </nav>
      )}
    </div>
  );
}
