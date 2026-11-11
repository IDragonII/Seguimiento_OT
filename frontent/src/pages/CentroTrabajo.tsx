import { useEffect, useState } from 'react'
import {
  ClipboardList,
  History,
  LayoutGrid,
  List,
  PackageCheck,
  Search,
  Undo2,
} from 'lucide-react'
import { api } from '../api/api'
import Modal from '../components/Modal'
import { ESTADOS_OT, coloresDe } from '../components/panel/estadosOT'

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

interface TipoOT {
  id: number
  nombre: string
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

type Categoria = 'poder' | 'solicitadas' | 'historial'

const CATEGORIAS: { key: Categoria; nombre: string }[] = [
  { key: 'poder', nombre: 'En mi poder' },
  { key: 'solicitadas', nombre: 'Devoluciones solicitadas' },
  { key: 'historial', nombre: 'Historial' },
]

const ACCIONES: Record<string, string> = {
  REGISTRO: 'Registro de la OT',
  ENTREGA: 'Entrega al técnico',
  SOLICITUD_DEVOLUCION: 'Solicitud de devolución',
  CONFIRMACION_RECEPCION: 'Confirmación de recepción',
  ALERTA_VENCIMIENTO: 'Alerta de vencimiento',
}

function categoriaDe(d: DetalleMisOT): Categoria {
  if (d.recibidoPor) return 'historial'
  if (d.fechaDevolucion) return 'solicitadas'
  return 'poder'
}

function anclaDe(d: DetalleMisOT): string | null {
  if (d.fechaProgramacion) return d.fechaProgramacion.slice(0, 10)
  const fecha = d.entrega?.fechaEntrega
  if (fecha) return fecha.slice(0, 10)
  return null
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

function tiempoDesde(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'Ahora mismo'
  const minutos = Math.floor(ms / 60000)
  if (minutos < 60) return 'Hace unos minutos'
  const horas = Math.floor(ms / 360000)
  if (horas < 24) return `Hace ${horas} h`
  const dias = Math.floor(ms / 86400000)
  return dias === 1 ? 'Hace 1 día' : `Hace ${dias} días`
}

function ordenDe(d: DetalleMisOT): string {
  return d.entrega?.fechaEntrega || d.fechaCreacion || ''
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

function PuntoAtencion({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <span
      data-alerta-pendiente
      title="Alerta de vencimiento pendiente"
      className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#D97706]"
    />
  )
}

function FormDevolucion({
  detalle,
  onCancelar,
  onConfirmado,
}: {
  detalle: DetalleMisOT
  onCancelar: () => void
  onConfirmado: () => void
}) {
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    setEnviando(true)
    setError('')
    try {
      await api.post(`/entregas/detalle/${detalle.id}/solicitar-devolucion`, {
        observacion,
      })
      onConfirmado()
    } catch (err) {
      setError((err as Error).message || 'No se pudo solicitar la devolución')
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={`Solicitar devolución — OT #${detalle.ordenTrabajo?.numeroOT ?? ''}`}
      ancho={460}
      onCerrar={onCancelar}
    >
      <div data-devolucion-form className="space-y-3">
        <p className="text-sm text-[#55657A]">
          Al solicitar la devolución, la OT quedará en espera de recepción por parte de la
          administración.
        </p>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
            Observación (opcional)
          </span>
          <textarea
            data-devolucion-obs
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
            placeholder="Motivo o estado de la OT…"
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
          />
        </label>
        {error && (
          <div
            data-devolucion-error
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" data-devolucion-cancelar className="btn-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            type="button"
            data-devolucion-enviar
            className="btn"
            disabled={enviando}
            onClick={enviar}
          >
            {enviando ? 'Enviando…' : 'Solicitar devolución'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Expediente({
  detalle,
  onCerrar,
  onSolicitar,
}: {
  detalle: DetalleMisOT
  onCerrar: () => void
  onSolicitar: () => void
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
  const cat = categoriaDe(detalle)

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
      <div data-expediente-modal>
        <div
          className="mb-4 flex items-center justify-between rounded-lg px-3 py-2"
          style={{ backgroundColor: col.fondo }}
        >
          <span className="text-sm font-semibold" style={{ color: col.texto }}>
            {ot?.tipoOT?.nombre || 'Sin tipo'}
          </span>
          <BadgeEstado estado={estado} />
        </div>

        {ot?.descripcion && (
          <p className="mb-4 text-sm leading-relaxed text-[#55657A]">{ot.descripcion}</p>
        )}

        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Información operativa
        </h3>
        <dl className="mb-4">
          <Fila label="Fecha de registro" valor={fechaCorta(ot?.fechaRegistro)} />
          <Fila
            label="Fecha programada"
            valor={
              detalle.fechaProgramacion ? fechaCorta(detalle.fechaProgramacion) : 'Sin programar'
            }
          />
          <Fila label="Fecha de entrega" valor={fechaHora(detalle.entrega?.fechaEntrega)} />
          <Fila label="Técnico responsable" valor={nombreDe(detalle.tecnico)} />
          <Fila label="Ubicación actual" valor={ot?.ubicacion} />
          <Fila label="Tiempo transcurrido" valor={tiempoDesde(detalle.entrega?.fechaEntrega)} />
          <Fila label="Observación de entrega" valor={detalle.entrega?.observacion} />
        </dl>

        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Seguimiento
        </h3>
        <dl className="mb-3">
          {detalle.fechaDevolucion && (
            <Fila
              label="Solicitud de devolución"
              valor={fechaHora(detalle.fechaDevolucion)}
            />
          )}
          {detalle.fechaDevolucion && <Fila label="Observación de la solicitud" valor={detalle.observacion} />}
          {detalle.recibidoPor && (
            <Fila
              label="Recepción administrativa"
              valor={`Confirmada por ${nombreDe(detalle.recibidoPor) ?? '—'}`}
            />
          )}
          {detalle.recibidoPor && recepcion && (
            <Fila label="Fecha de recepción" valor={fechaHora(recepcion.fecha)} />
          )}
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
          {cat === 'poder' && (
            <button type="button" data-accion-devolucion className="btn" onClick={onSolicitar}>
              <Undo2 size={15} aria-hidden="true" />
              Solicitar devolución
            </button>
          )}
          {cat === 'solicitadas' && (
            <p className="text-xs font-medium text-[#9A5B0B]">
              Solicitud enviada — pendiente de recepción administrativa.
            </p>
          )}
          {cat === 'historial' && (
            <p className="text-xs font-medium text-[#55657A]">
              Ciclo finalizado — recepción confirmada por la administración.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function CentroTrabajo() {
  const [items, setItems] = useState<DetalleMisOT[] | null>(null)
  const [error, setError] = useState('')
  const [tipos, setTipos] = useState<TipoOT[]>([])
  const [alertasOt, setAlertasOt] = useState<Set<number>>(new Set())
  const [usuario] = useState<{ nombres?: string; apellidos?: string } | null>(() => {
    try {
      return api.getUsuario()
    } catch {
      return null
    }
  })

  const [categoria, setCategoria] = useState<Categoria>('poder')
  const [busqueda, setBusqueda] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [orden, setOrden] = useState('reciente')
  const [vista, setVista] = useState<'lista' | 'fichas'>('lista')

  const [seleccion, setSeleccion] = useState<DetalleMisOT | null>(null)
  const [formDevolucion, setFormDevolucion] = useState(false)
  const [hoy] = useState(() => new Date())

  function recargar(): Promise<DetalleMisOT[]> {
    return api.get('/entregas/mis-ot').then((lista: DetalleMisOT[]) => {
      setItems(lista)
      return lista
    })
  }

  useEffect(() => {
    recargar().catch((err: Error) => setError(err.message || 'No se pudieron cargar tus órdenes'))
    api
      .get('/tipos-ot')
      .then((lista: TipoOT[]) => setTipos(lista))
      .catch(() => setTipos([]))
    api
      .get('/alertas/mis-alertas')
      .then((lista: { alerta?: { ordenTrabajo?: { id?: number } } }[]) =>
        setAlertasOt(
          new Set(
            lista
              .map((a) => a.alerta?.ordenTrabajo?.id)
              .filter((id): id is number => typeof id === 'number'),
          ),
        ),
      )
      .catch(() => setAlertasOt(new Set()))
  }, [])

  const estadoDe = (d: DetalleMisOT) => d.ordenTrabajo?.estado?.nombre ?? ''

  const conteo = (cat: Categoria) =>
    items?.filter((d) => categoriaDe(d) === cat).length ?? 0

  const enCategoria = (items ?? []).filter((d) => categoriaDe(d) === categoria)

  const filtradas = enCategoria.filter((d) => {
    const num = String(d.ordenTrabajo?.numeroOT ?? '')
    if (busqueda && !num.includes(busqueda.trim())) return false
    if (tipoId && String(d.ordenTrabajo?.tipoOT?.id ?? '') !== tipoId) return false
    if (estadoFiltro && estadoDe(d) !== estadoFiltro) return false
    if (desde || hasta) {
      const ancla = anclaDe(d)
      if (!ancla) return false
      if (desde && ancla < desde) return false
      if (hasta && ancla > hasta) return false
    }
    return true
  })

  const visibles = [...filtradas].sort((a, b) => {
    switch (orden) {
      case 'antiguo':
        return ordenDe(a).localeCompare(ordenDe(b))
      case 'num-asc':
        return (a.ordenTrabajo?.numeroOT ?? 0) - (b.ordenTrabajo?.numeroOT ?? 0)
      case 'num-desc':
        return (b.ordenTrabajo?.numeroOT ?? 0) - (a.ordenTrabajo?.numeroOT ?? 0)
      case 'programacion': {
        const fa = a.fechaProgramacion ?? ''
        const fb = b.fechaProgramacion ?? ''
        if (!fa && !fb) return 0
        if (!fa) return 1
        if (!fb) return -1
        return fa.localeCompare(fb)
      }
      case 'tiempo':
        return ordenDe(a).localeCompare(ordenDe(b))
      default:
        return ordenDe(b).localeCompare(ordenDe(a))
    }
  })

  async function confirmarDevolucion() {
    if (!seleccion) return
    try {
      const lista = await recargar()
      const fresco = lista.find((d) => d.id === seleccion.id)
      if (fresco) setSeleccion(fresco)
      setFormDevolucion(false)
    } catch (err) {
      setError((err as Error).message || 'No se pudo actualizar la OT')
      setFormDevolucion(false)
    }
  }

  const nombreTecnico = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ')
  const hoyLargo = hoy.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const hoyTexto = hoyLargo.charAt(0).toUpperCase() + hoyLargo.slice(1)

  const hayFiltros = Boolean(busqueda || tipoId || estadoFiltro || desde || hasta)
  const vaciaCategoria = enCategoria.length === 0
  const vaciaFiltrada = !vaciaCategoria && visibles.length === 0

  return (
    <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E4E8EE] bg-white px-5 py-4 shadow-[0_4px_18px_rgba(24,40,62,0.07)]">
          <div className="min-w-[240px]">
            <h1 className="text-2xl font-bold text-[#18283E]">Centro de trabajo</h1>
            <p className="mt-0.5 text-sm text-[#718096]">
              Gestiona tus órdenes asignadas y controla tus actividades
            </p>
            <p className="mt-1.5 text-xs text-[#A0AEC0]">
              Bienvenido a tu espacio de operaciones
              {nombreTecnico ? `, ${nombreTecnico}` : ''}. Hoy es {hoyTexto}.
            </p>
          </div>
          <div data-indicadores className="flex flex-wrap items-center gap-y-3 divide-x divide-[#E4E8EE]">
            <Indicador
              id="TOTAL"
              icono={ClipboardList}
              valor={items?.length ?? 0}
              etiqueta="Órdenes asignadas"
              color="#3478C7"
            />
            <Indicador
              id="PODER"
              icono={PackageCheck}
              valor={conteo('poder')}
              etiqueta="Bajo responsabilidad"
              color="#27976B"
            />
            <Indicador
              id="SOLICITADAS"
              icono={Undo2}
              valor={conteo('solicitadas')}
              etiqueta="Devoluciones por recibir"
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
            Cargando tus órdenes…
          </div>
        )}

        {items !== null && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-10 text-center">
            <ClipboardList size={40} strokeWidth={1.5} className="mx-auto text-[#A0AEC0]" />
            <p className="mt-3 text-sm font-medium text-[#55657A]">
              No tienes órdenes de trabajo asignadas.
            </p>
          </div>
        )}

        {items !== null && items.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div data-categorias className="flex flex-wrap gap-1 rounded-lg bg-[#EDF1F6] p-1">
                {CATEGORIAS.map((c) => {
                  const activa = categoria === c.key
                  return (
                    <button
                      key={c.key}
                      type="button"
                      data-categoria={c.key}
                      aria-pressed={activa}
                      onClick={() => setCategoria(c.key)}
                      className={
                        activa
                          ? 'rounded-md bg-white px-3.5 py-1.5 text-sm font-semibold text-[#18283E] shadow-sm'
                          : 'rounded-md px-3.5 py-1.5 text-sm font-medium text-[#718096] hover:text-[#18283E]'
                      }
                    >
                      {c.nombre} ({conteo(c.key)})
                    </button>
                  )
                })}
              </div>
            </div>

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
                data-filtro-tipo
                value={tipoId}
                onChange={(e) => setTipoId(e.target.value)}
                className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
              >
                <option value="">Todos los tipos</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>

              <select
                data-filtro-estado
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
              >
                <option value="">Todos los estados</option>
                {ESTADOS_OT.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 text-xs font-medium text-[#718096]">
                Desde
                <input
                  data-filtro-desde
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="rounded-lg border border-[#E4E8EE] bg-white px-2 py-1.5 text-xs text-[#18283E] outline-none focus:border-[#3478C7]"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#718096]">
                Hasta
                <input
                  data-filtro-hasta
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="rounded-lg border border-[#E4E8EE] bg-white px-2 py-1.5 text-xs text-[#18283E] outline-none focus:border-[#3478C7]"
                />
              </label>

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
                <option value="programacion">Fecha de programación</option>
                <option value="tiempo">Mayor tiempo transcurrido</option>
              </select>

              <div className="flex overflow-hidden rounded-lg border border-[#E4E8EE]">
                <button
                  type="button"
                  data-vista="lista"
                  aria-pressed={vista === 'lista'}
                  onClick={() => setVista('lista')}
                  className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold ${
                    vista === 'lista'
                      ? 'bg-[#18283E] text-white'
                      : 'bg-white text-[#718096] hover:bg-[#EDF4FC]'
                  }`}
                >
                  <List size={14} aria-hidden="true" />
                  Lista
                </button>
                <button
                  type="button"
                  data-vista="fichas"
                  aria-pressed={vista === 'fichas'}
                  onClick={() => setVista('fichas')}
                  className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold ${
                    vista === 'fichas'
                      ? 'bg-[#18283E] text-white'
                      : 'bg-white text-[#718096] hover:bg-[#EDF4FC]'
                  }`}
                >
                  <LayoutGrid size={14} aria-hidden="true" />
                  Fichas
                </button>
              </div>

              <span data-resultados className="ml-auto text-xs font-medium text-[#718096]">
                {visibles.length} resultado{visibles.length === 1 ? '' : 's'}
              </span>
            </div>

            {vaciaCategoria && (
              <div
                data-lista-vacia
                className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-8 text-center text-sm text-[#718096]"
              >
                Sin órdenes en esta categoría.
              </div>
            )}

            {vaciaFiltrada && (
              <div
                data-lista-vacia
                className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-8 text-center text-sm text-[#718096]"
              >
                {hayFiltros
                  ? 'Sin resultados con los filtros actuales.'
                  : 'Sin órdenes en esta categoría.'}
              </div>
            )}

            {visibles.length > 0 && vista === 'lista' && (
              <div className="overflow-hidden rounded-xl border border-[#E4E8EE] bg-white">
                {visibles.map((d) => {
                  const ot = d.ordenTrabajo
                  const estado = estadoDe(d)
                  const num = ot?.numeroOT ?? 0
                  const col = coloresDe(estado)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      data-expediente={num}
                      data-estado={estado}
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
                      <BadgeEstado estado={estado} />
                      <div className="min-w-[130px] flex-1 truncate text-xs text-[#55657A]">
                        <span className="font-medium text-[#718096]">Ubicación: </span>
                        {ot?.ubicacion || '—'}
                      </div>
                      <div className="text-right text-[11px] leading-relaxed text-[#718096]">
                        <div>
                          Prog:{' '}
                          <span className="font-medium text-[#55657A]">
                            {fechaCorta(d.fechaProgramacion) || '—'}
                          </span>
                        </div>
                        <div>
                          Entrega:{' '}
                          <span className="font-medium text-[#55657A]">
                            {fechaCorta(d.entrega?.fechaEntrega) || '—'}
                          </span>
                        </div>
                      </div>
                      <div className="flex w-[110px] shrink-0 items-center justify-end gap-2 text-xs font-medium text-[#718096]">
                        <PuntoAtencion visible={alertasOt.has(ot?.id ?? -1)} />
                        {tiempoDesde(d.entrega?.fechaEntrega) || '—'}
                      </div>
                      <span
                        className="hidden h-8 w-1 shrink-0 rounded-full sm:block"
                        style={{ backgroundColor: col.borde }}
                        aria-hidden="true"
                      />
                    </button>
                  )
                })}
              </div>
            )}

            {visibles.length > 0 && vista === 'fichas' && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibles.map((d) => {
                  const ot = d.ordenTrabajo
                  const estado = estadoDe(d)
                  const num = ot?.numeroOT ?? 0
                  const col = coloresDe(estado)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      data-expediente={num}
                      data-estado={estado}
                      onClick={() => setSeleccion(d)}
                      className="rounded-xl border border-[#E4E8EE] bg-white p-4 text-left transition hover:border-[#3478C7]/50 hover:shadow-[0_4px_14px_rgba(24,40,62,0.08)] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-lg font-bold leading-tight text-[#18283E]">
                            #{num}
                          </div>
                          <div className="text-xs text-[#718096]">
                            {ot?.tipoOT?.nombre || 'Sin tipo'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <PuntoAtencion visible={alertasOt.has(ot?.id ?? -1)} />
                          <BadgeEstado estado={estado} />
                        </div>
                      </div>
                      <div
                        className="my-3 h-1 w-full rounded-full"
                        style={{ backgroundColor: col.borde }}
                        aria-hidden="true"
                      />
                      <div className="space-y-1 text-xs text-[#55657A]">
                        <div className="truncate">
                          <span className="font-medium text-[#718096]">Ubicación: </span>
                          {ot?.ubicacion || '—'}
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>
                            Prog:{' '}
                            <span className="font-medium">
                              {fechaCorta(d.fechaProgramacion) || '—'}
                            </span>
                          </span>
                          <span>
                            Entrega:{' '}
                            <span className="font-medium">
                              {fechaCorta(d.entrega?.fechaEntrega) || '—'}
                            </span>
                          </span>
                        </div>
                        <div className="pt-1 text-[#718096]">
                          {tiempoDesde(d.entrega?.fechaEntrega) || '—'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {seleccion && (
        <Expediente
          detalle={seleccion}
          onCerrar={() => setSeleccion(null)}
          onSolicitar={() => setFormDevolucion(true)}
        />
      )}

      {seleccion && formDevolucion && (
        <FormDevolucion
          detalle={seleccion}
          onCancelar={() => setFormDevolucion(false)}
          onConfirmado={confirmarDevolucion}
        />
      )}
    </main>
  )
}
