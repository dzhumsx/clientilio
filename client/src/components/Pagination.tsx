import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  itemLabel?: string;
  hideIfSinglePage?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [6, 12, 24],
  itemLabel = 'itens',
  hideIfSinglePage = true,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // If there are no items or only 1 page and hideIfSinglePage is true, don't show pagination
  if (totalItems === 0 || (totalPages <= 1 && hideIfSinglePage && totalItems <= itemsPerPageOptions[0])) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis windowing
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1.25rem',
        background: 'var(--bg-surface)',
        borderRadius: '6px',
        border: '1px solid var(--border-hairline)',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginTop: '0.5rem',
      }}
    >
      {/* Items count & Per Page selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
          }}
        >
          Mostrando <strong style={{ color: 'var(--text-primary)' }}>{startItem}-{endItem}</strong> de <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> {itemLabel}
        </span>

        {onItemsPerPageChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Exibir:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              style={{
                width: 'auto',
                height: '28px',
                padding: '0 0.5rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} por página
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="btn btn-sm"
          style={{
            height: '30px',
            padding: '0 0.6rem',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-hairline)',
            color: currentPage <= 1 ? 'var(--text-disabled)' : 'var(--text-primary)',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage <= 1 ? 0.5 : 1,
          }}
        >
          <ChevronLeft size={14} />
          <span>Anterior</span>
        </button>

        {/* Page numbers */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: '0 0.35rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ...
              </span>
            );
          }

          const pageNum = p as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              style={{
                minWidth: '30px',
                height: '30px',
                padding: '0 0.35rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: isActive ? 700 : 500,
                borderRadius: '4px',
                border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-hairline)',
                background: isActive ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                color: isActive ? '#ffffff' : 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="btn btn-sm"
          style={{
            height: '30px',
            padding: '0 0.6rem',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-hairline)',
            color: currentPage >= totalPages ? 'var(--text-disabled)' : 'var(--text-primary)',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage >= totalPages ? 0.5 : 1,
          }}
        >
          <span>Próximo</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
