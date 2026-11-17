import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  page: number // página actual, base 0
  size: number // elementos por página
  total: number // total de elementos filtrados
  setPage: (page: number) => void
  className?: string
}

const CLASE_BOTON =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E8EE] bg-white text-[#55657A] transition hover:border-[#3478C7]/50 hover:bg-[#F0F5FB] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#E4E8EE] disabled:hover:bg-white'

// Paginación de las vistas del panel: recibe la página, el tamaño y el total
// filtrado, y muestra el rango visible + "Página X de Y".
export default function PaginacionPanel({ page, size, total, setPage, className = '' }: Props) {
  const totalPaginas = Math.max(1, Math.ceil(total / (size || 1)))
  const actual = Math.min(Math.max(0, page), totalPaginas - 1)
  const desde = total === 0 ? 0 : actual * size + 1
  const hasta = Math.min(total, (actual + 1) * size)

  return (
    <div data-paginacion className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-medium text-[#718096]">
        {desde}–{hasta} de {total}
      </span>

      <button
        type="button"
        className={CLASE_BOTON}
        onClick={() => setPage(actual - 1)}
        disabled={actual === 0}
        title="Página anterior"
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      <span className="whitespace-nowrap text-xs font-medium text-[#55657A]">
        Página {actual + 1} de {totalPaginas}
      </span>

      <button
        type="button"
        className={CLASE_BOTON}
        onClick={() => setPage(actual + 1)}
        disabled={actual >= totalPaginas - 1}
        title="Página siguiente"
        aria-label="Página siguiente"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
