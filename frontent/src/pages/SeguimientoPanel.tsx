import { useEffect, useState } from 'react'
import {
  Building2,
  Flag,
  Hash,
  Loader2,
  MapPin,
  Printer,
  Radar,
  Search,
  SearchX,
  Truck,
  Undo2,
  UserCheck,
} from 'lucide-react'
import { api } from '../api/api'
import Modal from '../components/Modal'
import { coloresDe } from '../components/panel/estadosOT'

interface UsuarioRef {
  id: number
  nombres?: string
  apellidos?: string
  email?: string
}

interface TipoOT {
  id: number
  nombre: string
}

interface OT {
  id: number
  numeroOT?: number
  tipoOT?: { id?: number; nombre?: string }
  estado?: { nombre?: string }
  apellidosNombre?: string | null
  categoria?: { id?: number; nombre?: string } | null
  ubicacion?: string
  fechaRegistro?: string
}

interface ResultadoBusqueda {
  orden: OT
  tecnicoActual?: UsuarioRef | null
  fechaEntrega?: string | null
  fechaDevolucion?: string | null
}

function fechaCorta(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function nombreDe(u?: UsuarioRef | null): string | undefined {
  if (!u) return undefined
  const nombre = [u.nombres, u.apellidos].filter(Boolean).join(' ').trim()
  return nombre || u.email
}

function BadgeEstado({ estado }: { estado: string }) {
  const col = coloresDe(estado)
  return (
    <span
      className="inline-block shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
      style={{ backgroundColor: col.borde }}
    >
      {estado || 'SIN ESTADO'}
    </span>
  )
}

function ModalResultado({ res, onCerrar }: { res: ResultadoBusqueda; onCerrar: () => void }) {
  const { orden, tecnicoActual, fechaEntrega, fechaDevolucion } = res
  const estado = orden.estado?.nombre ?? ''
  const col = coloresDe(estado)

  // Ciclo de vida de la OT: inicio (creación), entrega al técnico y devolución.
  const etapas = [
    {
      titulo: 'Inicio',
      icono: Flag,
      fecha: fechaCorta(orden.fechaRegistro),
      color: '#3478C7',
      completado: Boolean(orden.fechaRegistro),
    },
    {
      titulo: 'Entrega',
      icono: Truck,
      fecha: fechaCorta(fechaEntrega),
      color: '#27976B',
      completado: Boolean(fechaEntrega),
    },
    {
      titulo: 'Devolución',
      icono: Undo2,
      fecha: fechaCorta(fechaDevolucion),
      color: '#D97706',
      completado: Boolean(fechaDevolucion),
    },
  ]

  return (
    <Modal titulo="Detalle de Orden de Trabajo" ancho={640} onCerrar={onCerrar}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .modal-overlay, .modal-overlay * { visibility: visible; }
          .modal-overlay {
            position: absolute;
            inset: 0;
            padding: 0;
            background: #fff;
            overflow: visible;
            display: block;
          }
          .modal-panel {
            max-width: 100% !important;
            box-shadow: none;
            border-radius: 0;
          }
          .modal-body { overflow: visible !important; max-height: none !important; }
          .no-imprimir, .modal-cerrar { display: none !important; }
        }
      `}</style>

      <div data-ot-modal>
        {/* Encabezado: la OT y los nombres */}
        <div
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: col.fondo }}
        >
          <div className="min-w-0">
            <div className="text-2xl font-extrabold leading-none" style={{ color: col.texto }}>
              #{orden.numeroOT ?? '—'}
            </div>
            <div
              className="mt-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{ color: col.texto }}
            >
              {orden.tipoOT?.nombre || 'Sin tipo'}
              {orden.categoria?.nombre ? ` · ${orden.categoria.nombre}` : ''}
            </div>
            {orden.apellidosNombre && (
              <div
                className="mt-1 truncate text-xs font-medium"
                style={{ color: col.texto, opacity: 0.85 }}
              >
                {orden.apellidosNombre}
              </div>
            )}
          </div>
          <BadgeEstado estado={estado} />
        </div>

        {/* 3 figuras: inicio (creación), entrega y devolución */}
        <div className="relative mb-6" data-etapas>
          <div
            className="absolute left-[16.6667%] right-[16.6667%] top-[22px] h-0.5 rounded bg-[#E4E8EE]"
            aria-hidden="true"
          />
          <div className="relative grid grid-cols-3 gap-2">
            {etapas.map((e) => {
              const Icono = e.icono
              return (
                <div key={e.titulo} className="flex flex-col items-center text-center">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-full border-2 bg-white"
                    style={{
                      borderColor: e.completado ? e.color : '#CBD5E0',
                      color: e.completado ? e.color : '#A0AEC0',
                    }}
                  >
                    <Icono size={17} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <span className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#18283E]">
                    {e.titulo}
                  </span>
                  <span className="mt-0.5 text-[11px] leading-snug text-[#718096]">
                    {e.fecha ?? 'Pendiente'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ubicación: con técnico en campo o en oficina */}
        <div className="mb-5 overflow-hidden rounded-xl border border-[#E4E8EE]" data-ubicacion>
          <div className="flex items-center gap-1.5 border-b border-[#EEF1F5] bg-[#F8FAFC] px-4 py-2">
            <MapPin size={14} className="text-[#3478C7]" aria-hidden="true" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#18283E]">
              Ubicación
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3">
            <span className="min-w-0 text-sm font-medium text-[#18283E]">
              {orden.ubicacion || 'Sin ubicación registrada'}
            </span>
            {tecnicoActual ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#E3F4EE] px-3 py-1 text-xs font-bold text-[#1E6E52]">
                <UserCheck size={13} aria-hidden="true" />
                Con técnico: {nombreDe(tecnicoActual)}
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#E7F0FB] px-3 py-1 text-xs font-bold text-[#2C5FA3]">
                <Building2 size={13} aria-hidden="true" />
                En oficina
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-[#EEF1F5] pt-4">
          <button
            type="button"
            className="no-imprimir inline-flex items-center gap-2 rounded-lg border border-[#E4E8EE] bg-white px-4 py-2 text-sm font-semibold text-[#55657A] transition hover:border-[#3478C7] hover:text-[#3478C7] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40"
            onClick={() => window.print()}
          >
            <Printer size={15} aria-hidden="true" />
            Imprimir
          </button>
          <button
            type="button"
            data-cerrar
            className="rounded-lg bg-[#3478C7] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#2A66AB] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40"
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ModalNoEncontrado({
  tipoNombre,
  numero,
  onCerrar,
}: {
  tipoNombre: string
  numero: string
  onCerrar: () => void
}) {
  return (
    <Modal titulo="Orden no encontrada" ancho={440} onCerrar={onCerrar}>
      <div className="text-center" data-no-encontrado>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FDF1E4] text-[#D97706]">
          <SearchX size={26} aria-hidden="true" />
        </span>
        <p className="mt-3.5 text-sm font-bold text-[#18283E]">
          No se encontró la orden de trabajo
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#718096]">
          No existe una OT con el tipo <b className="text-[#18283E]">{tipoNombre}</b> y el número{' '}
          <b className="text-[#18283E]">#{numero}</b>.
        </p>
        <button
          type="button"
          data-cerrar
          className="mt-5 rounded-lg bg-[#3478C7] px-6 py-2 text-sm font-bold text-white transition hover:bg-[#2A66AB] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40"
          onClick={onCerrar}
        >
          Cerrar
        </button>
      </div>
    </Modal>
  )
}

export default function SeguimientoPanel() {
  const [tipos, setTipos] = useState<TipoOT[]>([])
  const [tipoId, setTipoId] = useState('')
  const [numero, setNumero] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null)
  const [noEncontrado, setNoEncontrado] = useState<{ tipo: string; numero: string } | null>(null)

  useEffect(() => {
    api
      .get('/tipos-ot')
      .then((lista: TipoOT[]) => setTipos(lista))
      .catch(() => setError('No se pudieron cargar los tipos de OT. Intenta nuevamente.'))
  }, [])

  function limpiarResultado() {
    setResultado(null)
    setNoEncontrado(null)
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    limpiarResultado()

    if (!tipoId || !numero.trim()) {
      setError('Selecciona el tipo de OT e ingresa el número de OT.')
      return
    }
    const n = Number(numero)
    if (!Number.isInteger(n) || n <= 0) {
      setError('El número de OT debe ser un número entero mayor a cero.')
      return
    }

    setCargando(true)
    try {
      const res = (await api.get(
        `/ordenes-trabajo/buscar?tipoId=${encodeURIComponent(tipoId)}&numero=${n}`
      )) as ResultadoBusqueda
      setResultado(res)
    } catch (err) {
      const e2 = err as Error & { status?: number }
      if (e2.status === 404) {
        const tipoNombre = tipos.find((t) => String(t.id) === tipoId)?.nombre ?? '—'
        setNoEncontrado({ tipo: tipoNombre, numero: String(n) })
      } else {
        setError(e2.message || 'No se pudo realizar la consulta. Intenta nuevamente.')
      }
    } finally {
      setCargando(false)
    }
  }

  const tipoNombreBuscado = noEncontrado?.tipo ?? ''

  return (
    <main className="flex-1 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-[#E4E8EE] bg-white shadow-[0_10px_40px_rgba(24,40,62,0.08)]">
          <header className="bg-[#18283E] px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#3478C7] text-white">
                <Radar size={20} strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-[15.5px] font-bold leading-tight tracking-[0.06em] text-white">
                  SIGOT
                </div>
                <div className="truncate text-[11px] text-[#A0AEC0]">
                  Sistema de Gestión y Seguimiento de Órdenes de Trabajo
                </div>
              </div>
            </div>

            <hr className="my-4 border-white/10" />

            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Consultar Orden de Trabajo
            </h1>
            <p className="mt-1 text-sm text-[#A0AEC0]">
              Busca una orden de trabajo por su tipo y número
            </p>
          </header>

          <form onSubmit={buscar} className="px-5 py-6 sm:px-8 sm:py-7">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#55657A]">
                  Tipo de OT
                </span>
                <select
                  data-filtro-tipo
                  value={tipoId}
                  onChange={(e) => {
                    setTipoId(e.target.value)
                    limpiarResultado()
                  }}
                  className="w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2.5 text-sm text-[#18283E] outline-none transition focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
                >
                  <option value="">Selecciona un tipo</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#55657A]">
                  Número de OT
                </span>
                <div className="relative">
                  <Hash
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]"
                    aria-hidden="true"
                  />
                  <input
                    data-buscar-numero
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={numero}
                    onChange={(e) => {
                      setNumero(e.target.value)
                      limpiarResultado()
                    }}
                    placeholder="Ej. 1001"
                    className="w-full appearance-none rounded-lg border border-[#E4E8EE] py-2.5 pl-9 pr-3 text-sm text-[#18283E] outline-none transition focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </label>

              <button
                type="submit"
                data-buscar
                disabled={cargando}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#3478C7] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#2A66AB] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {cargando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Buscando…
                  </>
                ) : (
                  <>
                    <Search size={16} aria-hidden="true" />
                    Buscar
                  </>
                )}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                data-error
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}
          </form>
        </div>
      </div>

      {resultado && (
        <ModalResultado res={resultado} onCerrar={() => setResultado(null)} />
      )}
      {noEncontrado && (
        <ModalNoEncontrado
          tipoNombre={tipoNombreBuscado}
          numero={noEncontrado.numero}
          onCerrar={() => setNoEncontrado(null)}
        />
      )}
    </main>
  )
}
