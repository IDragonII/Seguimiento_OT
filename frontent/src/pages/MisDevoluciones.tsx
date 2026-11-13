import { useEffect, useState } from 'react'
import { ClipboardList, History, PackageCheck, Search, Undo2 } from 'lucide-react'
import { api } from '../api/api'
import Modal from '../components/Modal'
import { coloresDe } from '../components/panel/estadosOT'

interface UsuarioRef {
  id: number
  nombres?: string
  apellidos?: string
  email?: string
}

interface OTInfo {
  id: number
  numeroOT?: number
  tipoOT?: { id?: number; nombre?: string }
  estado?: { nombre?: string }
  descripcion?: string
  ubicacion?: string
  fechaRegistro?: string
}

interface DetalleMisOT {
  id: number
  entrega?: { id?: number; fechaEntrega?: string; observacion?: string }
  ordenTrabajo?: OTInfo
  tecnico?: UsuarioRef
  recibidoPor?: UsuarioRef | null
  fechaDevolucion?: string | null
  observacion?: string | null
  fechaCreacion?: string
  fechaProgramacion?: string | null
}

interface MovHistorial {
  id: number
  accion: string
  fecha: string
  observacion?: string | null
  usuario?: UsuarioRef
  estadoAnterior?: { nombre?: string } | null
  estadoNuevo?: { nombre?: string } | null
}

const ACCIONES: Record<string, string> = {
  REGISTRO: 'Registro de la OT',
  ENTREGA: 'Entrega al técnico',
  SOLICITUD_DEVOLUCION: 'Solicitud de devolución',
  CONFIRMACION_RECEPCION: 'Confirmación de recepción',
  ALERTA_VENCIMIENTO: 'Alerta de vencimiento',
}

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

function BadgeEstado({ estado }: { estado: string }) {
  const col = coloresDe(estado)
  return (
    <span
      className="inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
      style={{ backgroundColor: col.borde }}
    >
      {estado || 'SIN ESTADO'}
    </span>
  )
}

function BadgeDevolucion({ recibidoPor }: { recibidoPor?: UsuarioRef | null }) {
  const recibida = Boolean(recibidoPor)
  return (
    <span
      data-estado-devolucion={recibida ? 'recibida' : 'solicitada'}
      className="inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
      style={{ backgroundColor: recibida ? '#27976B' : '#D97706' }}
    >
      {recibida ? 'Recibida' : 'Solicitada'}
    </span>
  )
}

function DetalleDevolucion({
  detalle,
  onCerrar,
}: {
  detalle: DetalleMisOT
  onCerrar: () => void
}) {
  const [hist, setHist] = useState<{
    otId: number
    lista: MovHistorial[] | null
    error: string
  }>({ otId: 0, lista: null, error: '' })

  const ot = detalle.ordenTrabajo
  const otId = ot?.id ?? null
  const estado = ot?.estado?.nombre ?? ''
  const col = coloresDe(estado)
  const recibida = Boolean(detalle.recibidoPor)

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
  const recepcion = historial?.find((m) => m.accion === 'CONFIRMACION_RECEPCION')

  return (
    <Modal titulo={`OT #${ot?.numeroOT ?? ''}`} ancho={640} onCerrar={onCerrar}>
      <div data-devolucion-modal>
        <div
          className="mb-4 flex items-center justify-between rounded-lg px-3 py-2"
          style={{ backgroundColor: col.fondo }}
        >
          <span className="text-sm font-semibold" style={{ color: col.texto }}>
            {ot?.tipoOT?.nombre || 'Sin tipo'}
          </span>
          <div className="flex items-center gap-2">
            <BadgeDevolucion recibidoPor={detalle.recibidoPor} />
            <BadgeEstado estado={estado} />
          </div>
        </div>

        {ot?.descripcion && (
          <p className="mb-4 text-sm leading-relaxed text-[#55657A]">{ot.descripcion}</p>
        )}

        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Datos de la devolución
        </h3>
        <dl className="mb-4">
          <Fila label="Fecha de solicitud" valor={fechaHora(detalle.fechaDevolucion)} />
          <Fila label="Observación de la solicitud" valor={detalle.observacion} />
          <Fila label="Estado" valor={recibida ? 'Recibida administrativamente' : 'Solicitada — pendiente de recepción'} />
          {recibida && <Fila label="Recibida por" valor={nombreDe(detalle.recibidoPor)} />}
          {recibida && recepcion && <Fila label="Fecha de recepción" valor={fechaHora(recepcion.fecha)} />}
          <Fila label="Ubicación actual" valor={ot?.ubicacion} />
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
                      <> · {m.estadoAnterior.nombre} → {m.estadoNuevo.nombre}</>
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

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#EEF1F5] pt-4">
          <p className="text-xs font-medium text-[#55657A]">
            {recibida
              ? 'Ciclo finalizado — recepción confirmada por la administración.'
              : 'Solicitud enviada — pendiente de recepción administrativa.'}
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default function MisDevoluciones() {
  const [items, setItems] = useState<DetalleMisOT[] | null>(null)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [orden, setOrden] = useState('reciente')
  const [seleccion, setSeleccion] = useState<DetalleMisOT | null>(null)

  useEffect(() => {
    api
      .get('/entregas/mis-ot')
      .then((lista: DetalleMisOT[]) => setItems(lista.filter((d) => Boolean(d.fechaDevolucion))))
      .catch((err: Error) => setError(err.message || 'No se pudieron cargar tus devoluciones'))
  }, [])

  const devoluciones = items ?? []
  const pendientes = devoluciones.filter((d) => !d.recibidoPor).length
  const recibidas = devoluciones.length - pendientes

  const filtradas = devoluciones.filter((d) => {
    const num = String(d.ordenTrabajo?.numeroOT ?? '')
    if (busqueda && !num.includes(busqueda.trim())) return false
    if (filtroEstado === 'solicitada' && d.recibidoPor) return false
    if (filtroEstado === 'recibida' && !d.recibidoPor) return false
    return true
  })

  const fechaDev = (d: DetalleMisOT) => d.fechaDevolucion || d.fechaCreacion || ''
  const visibles = [...filtradas].sort((a, b) => {
    switch (orden) {
      case 'antiguo':
        return fechaDev(a).localeCompare(fechaDev(b))
      case 'num-asc':
        return (a.ordenTrabajo?.numeroOT ?? 0) - (b.ordenTrabajo?.numeroOT ?? 0)
      case 'num-desc':
        return (b.ordenTrabajo?.numeroOT ?? 0) - (a.ordenTrabajo?.numeroOT ?? 0)
      default:
        return fechaDev(b).localeCompare(fechaDev(a))
    }
  })

  const hayFiltros = Boolean(busqueda || filtroEstado)
  const vaciaTotal = devoluciones.length === 0
  const vaciaFiltrada = !vaciaTotal && visibles.length === 0

  return (
    <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E4E8EE] bg-white px-5 py-4 shadow-[0_4px_18px_rgba(24,40,62,0.07)]">
          <div className="min-w-[240px]">
            <h1 className="text-2xl font-bold text-[#18283E]">Mis devoluciones</h1>
            <p className="mt-0.5 text-sm text-[#718096]">Tus devoluciones registradas</p>
          </div>
          <div data-indicadores className="flex flex-wrap items-center gap-y-3 divide-x divide-[#E4E8EE]">
            <Indicador
              id="TOTAL"
              icono={ClipboardList}
              valor={devoluciones.length}
              etiqueta="Devoluciones"
              color="#3478C7"
            />
            <Indicador
              id="PENDIENTES"
              icono={Undo2}
              valor={pendientes}
              etiqueta="Pendientes de recepción"
              color="#D97706"
            />
            <Indicador
              id="RECIBIDAS"
              icono={PackageCheck}
              valor={recibidas}
              etiqueta="Recibidas"
              color="#27976B"
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
            Cargando tus devoluciones…
          </div>
        )}

        {items !== null && vaciaTotal && (
          <div
            data-lista-vacia
            className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-10 text-center"
          >
            <ClipboardList size={40} strokeWidth={1.5} className="mx-auto text-[#A0AEC0]" />
            <p className="mt-3 text-sm font-medium text-[#55657A]">
              Aún no tienes devoluciones registradas.
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
                data-filtro-devolucion
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
              >
                <option value="">Todas las devoluciones</option>
                <option value="solicitada">Solicitadas</option>
                <option value="recibida">Recibidas</option>
              </select>

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
                  : 'Aún no tienes devoluciones registradas.'}
              </div>
            )}

            {visibles.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-[#E4E8EE] bg-white">
                {visibles.map((d) => {
                  const ot = d.ordenTrabajo
                  const estado = ot?.estado?.nombre ?? ''
                  const num = ot?.numeroOT ?? 0
                  return (
                    <button
                      key={d.id}
                      type="button"
                      data-devolucion={num}
                      onClick={() => setSeleccion(d)}
                      className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#EEF1F5] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#F0F5FB] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#3478C7]/40"
                    >
                      <div className="w-[110px] shrink-0">
                        <div className="text-base font-bold leading-tight text-[#18283E]">
                          #{num}
                        </div>
                        <div className="text-[11px] text-[#718096]">
                          {ot?.tipoOT?.nombre || 'Sin tipo'}
                        </div>
                      </div>
                      <BadgeDevolucion recibidoPor={d.recibidoPor} />
                      <BadgeEstado estado={estado} />
                      <div className="min-w-[130px] flex-1 truncate text-xs text-[#55657A]">
                        <span className="font-medium text-[#718096]">Solicitud: </span>
                        {fechaHora(d.fechaDevolucion) || '—'}
                      </div>
                      <div className="text-right text-[11px] leading-relaxed text-[#718096]">
                        <div>
                          Recibida por:{' '}
                          <span className="font-medium text-[#55657A]">
                            {d.recibidoPor ? nombreDe(d.recibidoPor) || '—' : 'Pendiente'}
                          </span>
                        </div>
                        <div>
                          Ubicación:{' '}
                          <span className="font-medium text-[#55657A]">
                            {ot?.ubicacion || '—'}
                          </span>
                        </div>
                      </div>
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
        <DetalleDevolucion detalle={seleccion} onCerrar={() => setSeleccion(null)} />
      )}
    </main>
  )
}
