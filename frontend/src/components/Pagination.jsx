// Reusable server-side pagination controls. Expects the backend envelope shape:
// pagination = { total, page, limit, totalPages }.
function Pagination({ pagination, onPageChange, isLoading = false }) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { page, totalPages, total } = pagination;
  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let number = start; number <= Math.min(totalPages, start + 4); number += 1) {
    pages.push(number);
  }

  return (
    <nav className="pagination-bar" aria-label="Pagination">
      <span className="text-xs text-gray-500">
        Page {page} of {totalPages} · {total} records
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={isLoading || page <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
          className="pagination-button"
        >
          &laquo; First
        </button>
        <button
          type="button"
          disabled={isLoading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="pagination-button"
        >
          Prev
        </button>
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            disabled={isLoading}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onPageChange(number)}
            className={`pagination-button ${number === page ? 'is-active' : ''}`}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          disabled={isLoading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="pagination-button"
        >
          Next
        </button>
        <button
          type="button"
          disabled={isLoading || page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
          className="pagination-button"
        >
          Last &raquo;
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
