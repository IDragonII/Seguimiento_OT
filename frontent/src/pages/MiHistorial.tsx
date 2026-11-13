import { useEffect, useState } from 'react'
import { ClipboardList, History, ListChecks, Search } from 'lucide-react'
import { api } from '../api/api'
import Modal from '../components/Modal'
import { coloresDe } from '../components/panel/estadosOT'

interface UsuarioRef {
  id: number
  nombres?: string
  apellidos?: string
  email?: string
}

interface OTRef {
  id: number
  numeroOT?: number
  tipoOT?: { id?: number; nombre?: string }
  estado?: { nombre?: string }
  descripcion?: string
  ubicacion?: string
  fechaRegistro?: string
}

interface MovHistorial {
  id: number
  accion: string
  fecha: string
  observacion?: string | null
  usuario?: UsuarioRef
  estadoAnterior?: { nombre?: string } | null
  estadoNuevo?: { nombre?: string } | null
  ordenTrabajo?: OTRef
}

const ACCIONES: Record<string, string> = {
  REGISTRO: 'Registro de la OT',
  ENTREGA: 'Entrega al técnico',
  SOLICITUD_DEVOLUCION: 'Solicitud de devolución',
  CONFIRMACION_RECEPCION: 'Confirmación de recepción',
  ALERTA_VENCIMIENTO: 'Alerta de vencimiento',
}

const COLOR_ACCION: Record<string, string> = {
  REGISTRO: '#64748B',
  ENTREGA: '#3478C7',
  SOLICITUD_DEVOLUCION: '#D97706',
  CONFIRMACION_RECEPCION: '#27976B',
  ALERTA_VENCIMIENTO: '#DC2626',
}

const HACE_7_DIAS = Date.now() - 7 * 86400000

function fechaCorta(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const [a, m, dia] = iso.slice(0, 10).split('-').map(Number)
  if (!a || !m || !dia) return undefined
  return new Date(a, m - 1, dia).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fechaHora(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function nombreDe(u?: UsuarioRef | null): string | undefined {
  if (!u) return undefined
  const nombre = [u.nombres, u.apellidos].filter(Boolean).join(' ').trim()
  return nombre || u.email
}

function Fila({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F5] py-2 last:border-b-0">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[#718096]">
        {label}
      </dt>
      <dd className="text-right text-sm text-[#18283E]">{valor}</dd>
    </div>
  )
}

function Indicador({
  id,
  icono: Icono,
  valor,
  etiqueta,
  color,
}: {
  id: string
  icono: typeof ClipboardList
  valor: number
  etiqueta: string
  color: string
}) {
  return (
    <div data-indicador={id} className="flex items-center gap-2.5 px-4 first:pl-0 last:pr-0">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1A` }}
      >
        <Icono size={17} color={color} aria-hidden="true" />
      </span>
      <div>
        <div className="text-lg font-bold leading-none text-[#18283E]">{valor}</div>
        <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#718096]">
          {etiqueta}
        </div>
      </div>
    </div>
  )
}

function BadgeAccion({ accion }: { accion: string }) {
  const color = COLOR_ACCION[accion] ?? '#64748B'
  return (
    <span
      className="inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {ACCIONES[accion] ?? accion}
    </span>
  )
}

function DetalleMovimiento({ mov, onCerrar }: { mov: MovHistorial; onCerrar: () => void }) {
  const [hist, setHist] = useState<{
    otId: number
    lista: MovHistorial[] | null
    error: string
  }>({ otId: 0, lista: null, error: '' })

  const ot = mov.ordenTrabajo
  const otId = ot?.id ?? null
  const estado = ot?.estado?.nombre ?? ''
  const col = coloresDe(estado)

  useEffect(() => {
    if (!otId) return
    let vivo = true
    api
      .get(`/ordenes-trabajo/${otId}/historial`)
      .then((lista: MovHistorial[]) => {
        if (vivo) setHist({ otId, lista, error: '' })
      })
      .catch((err: Error) => {
        if (vivo)
          setHist({
            otId,
            lista: null,
            error: err.message || 'No se pudo cargar el historial',
          })
      })
    return () => {
      vivo = false
    }
  }, [otId])

  const historial = hist.otId === otId ? hist.lista : null
  const histError = hist.otId === otId ? hist.error : ''

  return (
    <Modal titulo={`Movimiento de la OT #${ot?.numeroOT ?? ''}`} ancho={640} onCerrar={onCerrar}>
      <div data-historial-modal>
        <div
          className="mb-4 flex items-center justify-between rounded-lg px-3 py-2"
          style={{ backgroundColor: col.fondo }}
        >
          <span className="text-sm font-semibold" style={{ color: col.texto }}>
            {ot?.tipoOT?.nombre || 'Sin tipo'}
          </span>
          <BadgeAccion accion={mov.accion} />
        </div>

        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Movimiento
        </h3>
        <dl className="mb-4">
          <Fila label="Acción" valor={ACCIONES[mov.accion] ?? mov.accion} />
          <Fila label="Fecha" valor={fechaHora(mov.fecha)} />
          <Fila label="Realizado por" valor={nombreDe(mov.usuario)} />
          {mov.estadoAnterior?.nombre && (
            <Fila
              label="Cambio de estado"
              valor={`${mov.estadoAnterior.nombre} → ${mov.estadoNuevo?.nombre ?? '—'}`}
            />
          )}
          <Fila label="Observación" valor={mov.observacion} />
        </dl>

        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Orden de trabajo
        </h3>
        <dl className="mb-4">
          <Fila label="Nº de OT" valor={ot?.numeroOT ? `#${ot.numeroOT}` : undefined} />
          <Fila label="Tipo" valor={ot?.tipoOT?.nombre} />
          <Fila label="Descripción" valor={ot?.descripcion} />
          <Fila label="Ubicación" valor={ot?.ubicacion} />
          <Fila label="Estado actual" valor={ot?.estado?.nombre} />
          <Fila label="Fecha de registro" valor={fechaCorta(ot?.fechaRegistro)} />
        </dl>

        <div className="rounded-lg border border-[#E4E8EE] bg-[#F8FAFC] p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#18283E]">
            <History size={14} className="text-[#3478C7]" aria-hidden="true" />
            Movimientos de la OT
          </h4>
          {historial === null && !histError && (
            <p className="text-xs text-[#718096]">Cargando movimientos…</p>
          )}
          {histError && <p className="text-xs text-red-600">{histError}</p>}
          {historial?.length === 0 && (
            <p className="text-xs text-[#718096]">Sin movimientos registrados.</p>
          )}
          {historial && historial.length > 0 && (
            <div className="space-y-0">
              {historial.map((m) => (
                <div key={m.id} className="historial-item">
                  <div className="accion">{ACCIONES[m.accion] ?? m.accion}</div>
                  <div className="meta">
                    {fechaHora(m.fecha)} · {nombreDe(m.usuario) ?? '—'}
                    {m.estadoAnterior?.nombre && m.estadoNuevo?.nombre && (
                      <>
                        {' '}
                        · {m.estadoAnterior.nombre} → {m.estadoNuevo.nombre}
                      </>
                    )}
                  </div>
                  {m.observacion && (
                    <p className="mt-1 text-xs text-[#718096]">{m.observacion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function MiHistorial() {
  const [items, setItems] = useState<MovHistorial[] | null>(null)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [orden, setOrden] = useState('reciente')
  const [seleccion, setSeleccion] = useState<MovHistorial | null>(null)

  useEffect(() => {
    api
      .get('/ordenes-trabajo/mis-historial')
      .then((lista: MovHistorial[]) => setItems(lista))
      .catch((err: Error) => setError(err.message || 'No se pudo cargar tu historial'))
  }, [])

  const movimientos = items ?? []
  const otsDistintas = new Set(movimientos.map((m) => m.ordenTrabajo?.id)).size
  const recientes = movimientos.filter((m) => new Date(m.fecha).getTime() >= HACE_7_DIAS).length

  const filtrados = movimientos.filter((m) => {
    const num = String(m.ordenTrabajo?.numeroOT ?? '')
    if (busqueda && !num.includes(busqueda.trim())) return false
    if (filtroAccion && m.accion !== filtroAccion) return false
    if (desde && m.fecha.slice(0, 10) < desde) return false
    if (hasta && m.fecha.slice(0, 10) > hasta) return false
    return true
  })

  const visibles = [...filtrados].sort((a, b) => {
    switch (orden) {
      case 'antiguo':
        return a.fecha.localeCompare(b.fecha)
      case 'num-asc':
        return (a.ordenTrabajo?.numeroOT ?? 0) - (b.ordenTrabajo?.numeroOT ?? 0)
      case 'num-desc':
        return (b.ordenTrabajo?.numeroOT ?? 0) - (a.ordenTrabajo?.numeroOT ?? 0)
      default:
        return b.fecha.localeCompare(a.fecha)
    }
  })

  const hayFiltros = Boolean(busqueda || filtroAccion || desde || hasta)
  const vaciaTotal = movimientos.length === 0
  const vaciaFiltrada = !vaciaTotal && visibles.length === 0

  return (
    <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E4E8EE] bg-white px-5 py-4 shadow-[0_4px_18px_rgba(24,40,62,0.07)]">
          <div className="min-w-[240px]">
            <h1 className="text-2xl font-bold text-[#18283E]">Mi historial</h1>
            <p className="mt-0.5 text-sm text-[#718096]">Movimientos de tus órdenes</p>
          </div>
          <div data-indicadores className="flex flex-wrap items-center gap-y-3 divide-x divide-[#E4E8EE]">
            <Indicador
              id="TOTAL"
              icono={ListChecks}
              valor={movimientos.length}
              etiqueta="Movimientos"
              color="#3478C7"
            />
            <Indicador
              id="OTS"
              icono={ClipboardList}
              valor={otsDistintas}
              etiqueta="Órdenes"
              color="#27976B"
            />
            <Indicador
              id="SEMANA"
              icono={History}
              valor={recientes}
              etiqueta="Últimos 7 días"
              color="#D97706"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {items === null && !error && (
          <div className="rounded-xl border border-[#E4E8EE] bg-white p-8 text-center text-sm text-[#718096]">
            Cargando tu historial…
          </div>
        )}

        {items !== null && vaciaTotal && (
          <div
            data-lista-vacia
            className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-10 text-center"
          >
            <History size={40} strokeWidth={1.5} className="mx-auto text-[#A0AEC0]" />
            <p className="mt-3 text-sm font-medium text-[#55657A]">
              Aún no hay movimientos en tus órdenes.
            </p>
          </div>
        )}

        {items !== null && !vaciaTotal && (
          <>
            <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#E4E8EE] bg-white px-4 py-3">
              <div className="relative min-w-[170px] flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]"
                  aria-hidden="true"
                />
                <input
                  data-buscador
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por Nº de OT"
                  className="w-full rounded-lg border border-[#E4E8EE] py-2 pl-9 pr-3 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
                />
              </div>

              <select
                data-filtro-accion
                value={filtroAccion}
                onChange={(e) => setFiltroAccion(e.target.value)}
                className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
              >
                <option value="">Todas las acciones</option>
                <option value="REGISTRO">Registro de la OT</option>
                <option value="ENTREGA">Entrega al técnico</option>
                <option value="SOLICITUD_DEVOLUCION">Solicitud de devolución</option>
                <option value="CONFIRMACION_RECEPCION">Confirmación de recepción</option>
                <option value="ALERTA_VENCIMIENTO">Alerta de vencimiento</option>
              </select>

              <input
                data-desde
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                aria-label="Fecha desde"
                className="rounded-lg border border-[#E4E8EE] px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
              />
              <input
                data-hasta
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                aria-label="Fecha hasta"
                className="rounded-lg border border-[#E4E8EE] px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
              />

              <select
                data-orden
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
              >
                <option value="reciente">Más reciente</option>
                <option value="antiguo">Más antigua</option>
                <option value="num-asc">Nº de OT ↑</option>
                <option value="num-desc">Nº de OT ↓</option>
              </select>

              <span data-resultados className="ml-auto text-xs font-medium text-[#718096]">
                {visibles.length} resultado{visibles.length === 1 ? '' : 's'}
              </span>
            </div>

            {vaciaFiltrada && (
              <div
                data-lista-vacia
                className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-8 text-center text-sm text-[#718096]"
              >
                {hayFiltros
                  ? 'Sin resultados con los filtros actuales.'
                  : 'Aún no hay movimientos en tus órdenes.'}
              </div>
            )}

            {visibles.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-[#E4E8EE] bg-white">
                {visibles.map((m) => {
                  const ot = m.ordenTrabajo
                  const num = ot?.numeroOT ?? 0
                  return (
                    <button
                      key={m.id}
                      type="button"
                      data-movimiento={m.id}
                      onClick={() => setSeleccion(m)}
                      className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#EEF1F5] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#F0F5FB] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#3478C7]/40"
                    >
                      <div className="w-[135px] shrink-0">
                        <div className="text-xs font-semibold leading-tight text-[#18283E]">
                          {fechaHora(m.fecha) || '—'}
                        </div>
                        <div className="text-[11px] text-[#718096]">#{num}</div>
                      </div>
                      <BadgeAccion accion={m.accion} />
                      <div className="min-w-[140px] flex-1 truncate text-xs text-[#55657A]">
                        <span className="font-medium text-[#718096]">Por: </span>
                        {nombreDe(m.usuario) || '—'}
                      </div>
                      {m.estadoAnterior?.nombre && m.estadoNuevo?.nombre && (
                        <div className="truncate text-[11px] text-[#718096]">
                          {m.estadoAnterior.nombre} → {m.estadoNuevo.nombre}
                        </div>
                      )}
                      <span
                        className="hidden h-8 w-1 shrink-0 rounded-full bg-[#3478C7]/40 sm:block"
                        aria-hidden="true"
                      />
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {seleccion && (
        <DetalleMovimiento mov={seleccion} onCerrar={() => setSeleccion(null)} />
      )}
    </main>
  )
}
