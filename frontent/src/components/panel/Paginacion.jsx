import { useEffect, useState } from 'react'

// Paginación controlada por el padre: recive page, size y total
// y muestra controles ◀ ▶ "Página X de Y".
export default function Paginacion({
  page = 0,      // página actual (controlada por padre)
  setPage,       // setter de página
  size = 15,     // tamaño de página
  total = 0,     // total de elementos
  className = '',
}) {
  const [localPage, setLocalPage] = useState(page)

  // Si el padre resetea la página (p. ej. al cambiar un filtro), se refleja.
  useEffect(() => {
    setLocalPage(page)
  }, [page])

  const handlePageChange = (newPage) => {
    setLocalPage(newPage)
    if (setPage) setPage(newPage)
  }

  const totalPages = Math.max(1, Math.ceil(total / (size || 1)))

  return (
    <div className={`paginacion ${className}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={() => handlePageChange(localPage > 0 ? localPage - 1 : localPage)}
        disabled={localPage === 0}
        style={{ marginRight: 4 }}
        title="Página anterior"
        aria-label="Página anterior"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <span>
        Página <strong>{localPage + 1}</strong> de <strong>{totalPages}</strong>
      </span>

      <button
        type="button"
        onClick={() => handlePageChange(localPage < totalPages - 1 ? localPage + 1 : localPage)}
        disabled={localPage >= totalPages - 1}
        style={{ marginLeft: 4 }}
        title="Página siguiente"
        aria-label="Página siguiente"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}
