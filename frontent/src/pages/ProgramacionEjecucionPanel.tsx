import { useEffect, useState, type ReactNode } from 'react'
import {
  Boxes,
  CheckCircle2,
  Clock,
  History,
  LayoutGrid,
  List,
  MapPin,
  PackageCheck,
  Search,
  Tag,
  Timer,
  Wrench,
} from 'lucide-react'
import { api } from '../api/api'
import Modal from '../components/Modal'
import { coloresDe } from '../components/panel/estadosOT'
import PaginacionPanel from '../components/panel/PaginacionPanel'

interface UsuarioRef {
  id: number
  nombres?: string
  apellidos?: string
  email?: string
}

interface MaterialAsign {
  id?: number
  cantidad?: number
  material?: { id?: number; nombre?: string; unidadMedida?: string | null }
}

interface OT {
  id: number
  numeroOT?: number
  tipoOT?: { id?: number; nombre?: string }
  estado?: { nombre?: string }
  apellidosNombre?: string | null
  descripcion?: string | null
  categoria?: { id?: number; nombre?: string } | null
  materiales?: MaterialAsign[]
  ubicacion?: string
  fechaRegistro?: string
  fechaInicioEstado?: string
  registradoPor?: UsuarioRef | null
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
  EDICION: 'Edición de la OT',
  MATERIALES: 'Actualización de materiales',
  ENTREGA: 'Entrega al técnico',
  SOLICITUD_DEVOLUCION: 'Solicitud de devolución',
  CONFIRMACION_RECEPCION: 'Confirmación de recepción',
  PROGRAMACION_EJECUCION: 'Programación para ejecución',
  ALERTA_VENCIMIENTO: 'Alerta de vencimiento',
}

type ModalState =
  | { tipo: 'detalle'; id: number }
  | { tipo: 'programar'; id: number }
  | null

const DIAS_ALERTA = 3

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

function diasDesde(iso?: string | null): number | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return undefined
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

function capitalizar(texto: string): string {
  if (!texto) return ''
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
}

function resumenMateriales(materiales?: MaterialAsign[]): string {
  const nombres = (materiales ?? [])
    .map((m) => m.material?.nombre?.trim())
    .filter((n): n is string => !!n)
  if (nombres.length === 0) {
    const total = materiales?.length ?? 0
    return total > 0 ? `${total} material${total === 1 ? '' : 'es'}` : 'Sin materiales'
  }
  if (nombres.length <= 2) return nombres.join(', ')
  return `${nombres[0]}, ${nombres[1]} +${nombres.length - 2}`
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
  icono: typeof Wrench
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

function ChipAntiguedad({ dias }: { dias?: number }) {
  if (dias == null) {
    return <span className="text-[11px] text-[#A0AEC0]">—</span>
  }
  const critico = dias >= 7
  const urgente = !critico && dias >= DIAS_ALERTA
  const color = critico ? '#C0392B' : urgente ? '#A16207' : '#5B6B80'
  const fondo = critico ? '#FBEDEC' : urgente ? '#FBF2E2' : '#F2F5F9'
  return (
    <span
      data-antiguedad={dias}
      title={`Devuelta hace ${dias} día${dias === 1 ? '' : 's'} sin programar`}
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] text-[10.5px] font-semibold tabular-nums"
      style={{ color, backgroundColor: fondo }}
    >
      <Clock size={11} aria-hidden="true" />
      {dias === 0 ? 'Hoy' : `${dias} día${dias === 1 ? '' : 's'}`}
    </span>
  )
}

function EtiquetaEstado({ estado, solido }: { estado: string; solido?: boolean }) {
  const col = coloresDe(estado)
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.05em]"
      style={
        solido
          ? { color: '#FFFFFF', backgroundColor: col.borde, borderColor: col.borde }
          : { color: col.texto, backgroundColor: col.fondo, borderColor: `${col.borde}33` }
      }
    >
      <span
        className="h-[5px] w-[5px] rounded-full"
        style={{ backgroundColor: solido ? 'rgba(255,255,255,0.85)' : col.borde }}
        aria-hidden="true"
      />
      {capitalizar(estado) || 'Sin estado'}
    </span>
  )
}

function Dato({
  icono: Icono,
  children,
}: {
  icono: typeof Wrench
  children: ReactNode
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-[#718096]">
      <Icono size={12} className="shrink-0 text-[#A6B2C2]" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </span>
  )
}

function ModalDetalle({
  ot,
  onProgramar,
  onCerrar,
}: {
  ot: OT
  onProgramar: () => void
  onCerrar: () => void
}) {
  const [hist, setHist] = useState<MovHistorial[] | null>(null)
  const [histError, setHistError] = useState('')

  const estado = ot.estado?.nombre ?? ''
  const col = coloresDe(estado)
  const antiguedad = diasDesde(ot.fechaInicioEstado)

  useEffect(() => {
    let vivo = true
    api
      .get(`/ordenes-trabajo/${ot.id}/historial`)
      .then((lista: MovHistorial[]) => {
        if (vivo) setHist(lista)
      })
      .catch((err: Error) => {
        if (vivo) setHistError(err.message || 'No se pudo cargar el historial')
      })
    return () => {
      vivo = false
    }
  }, [ot.id])

  return (
    <Modal titulo={`OT #${ot.numeroOT ?? ''}`} ancho={640} onCerrar={onCerrar}>
      <div data-ejecucion-modal>
        <div
          className="mb-4 flex items-center justify-between rounded-lg px-3 py-2"
          style={{ backgroundColor: col.fondo }}
        >
          <span className="text-sm font-semibold" style={{ color: col.texto }}>
            {ot.tipoOT?.nombre || 'Sin tipo'}
          </span>
          <EtiquetaEstado estado={estado} solido />
        </div>

        {ot.apellidosNombre && (
          <p className="mb-4 text-sm leading-relaxed text-[#55657A]">{ot.apellidosNombre}</p>
        )}

        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Datos de la OT
        </h3>
        <dl className="mb-4">
          <Fila label="Número" valor={ot.numeroOT != null ? `#${ot.numeroOT}` : undefined} />
          <Fila label="Tipo" valor={ot.tipoOT?.nombre} />
          <Fila label="Categoría" valor={ot.categoria?.nombre} />
          <Fila label="Descripción" valor={ot.descripcion} />
          <Fila
            label="Materiales"
            valor={
              ot.materiales && ot.materiales.length > 0
                ? ot.materiales
                    .map(
                      (m) =>
                        `${m.material?.nombre ?? '—'} × ${m.cantidad ?? '—'}${
                          m.material?.unidadMedida ? ` ${m.material.unidadMedida}` : ''
                        }`
                    )
                    .join(', ')
                : undefined
            }
          />
          <Fila label="Estado" valor={estado} />
          <Fila
            label="Devuelta hace"
            valor={
              antiguedad != null
                ? `${antiguedad} día${antiguedad === 1 ? '' : 's'}`
                : undefined
            }
          />
          <Fila label="Ubicación actual" valor={ot.ubicacion} />
          <Fila label="Fecha de registro" valor={fechaCorta(ot.fechaRegistro)} />
        </dl>

        <div className="rounded-lg border border-[#E4E8EE] bg-[#F8FAFC] p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#18283E]">
            <History size={14} className="text-[#3478C7]" aria-hidden="true" />
            Movimientos de la OT
          </h4>
          {hist === null && !histError && (
            <p className="text-xs text-[#718096]">Cargando movimientos…</p>
          )}
          {histError && <p className="text-xs text-red-600">{histError}</p>}
          {hist?.length === 0 && (
            <p className="text-xs text-[#718096]">Sin movimientos registrados.</p>
          )}
          {hist && hist.length > 0 && (
            <div className="space-y-0">
              {hist.map((m) => (
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

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#EEF1F5] pt-4">
          <button
            type="button"
            data-programar-ejecucion
            className="btn-secundario"
            onClick={onProgramar}
          >
            <Wrench size={15} aria-hidden="true" />
            Programar para ejecución
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ModalProgramar({
  ot,
  onCerrar,
  onProgramada,
}: {
  ot: OT
  onCerrar: () => void
  onProgramada: () => void
}) {
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    setEnviando(true)
    setError('')
    try {
      await api.put(`/ordenes-trabajo/${ot.id}/programar-ejecucion`, {
        observacion: observacion.trim(),
      })
      onProgramada()
    } catch (err) {
      setError((err as Error).message || 'No se pudo programar la OT')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={`Programar ejecución — OT #${ot.numeroOT ?? ''}`} ancho={520} onCerrar={onCerrar}>
      <div data-programar-form className="space-y-3">
        <p className="text-sm text-[#55657A]">
          La OT pasará de <strong>DEVUELTO</strong> a <strong>PROGRAMADO</strong> y quedará
          disponible para una nueva entrega al técnico.
        </p>
        <div className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs text-[#55657A]">
          <div>
            <span className="font-medium text-[#718096]">Tipo: </span>
            {ot.tipoOT?.nombre || 'Sin tipo'}
          </div>
          <div>
            <span className="font-medium text-[#718096]">Ubicación: </span>
            {ot.ubicacion || '—'}
          </div>
        </div>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
            Observación (opcional)
          </span>
          <textarea
            data-programar-observacion
            rows={3}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Motivo o indicaciones para la ejecución…"
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
          />
        </label>
        {error && (
          <div
            data-programar-error
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" data-programar-cancelar className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            data-programar-enviar
            className="btn"
            disabled={enviando}
            onClick={enviar}
          >
            {enviando ? 'Programando…' : 'Programar para ejecución'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

const CLASE_VISTA =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40'

export default function ProgramacionEjecucionPanel() {
  const usuario = api.getUsuario()
  const puedeProgramar = ['ADMIN', 'INSTALADOR'].includes(usuario?.rol ?? '')

  const [ots, setOts] = useState<OT[] | null>(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [vista, setVista] = useState<'lista' | 'fichas'>('lista')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('antigua')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState<ModalState>(null)

  async function recargar() {
    try {
      const lista = await api.get('/ordenes-trabajo/devueltas')
      setOts(lista as OT[])
      setError('')
    } catch (err) {
      setError((err as Error).message || 'No se pudieron cargar las OT devueltas')
    }
  }

  useEffect(() => {
    recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lista = ots ?? []
  const conMateriales = lista.filter((o) => (o.materiales?.length ?? 0) > 0).length
  const demoradas = lista.filter((o) => (diasDesde(o.fechaInicioEstado) ?? 0) >= DIAS_ALERTA).length

  const filtradas = lista.filter((o) => {
    if (!busqueda) return true
    const q = busqueda.trim().toLowerCase()
    return (
      String(o.numeroOT ?? '').includes(q) ||
      (o.apellidosNombre ?? '').toLowerCase().includes(q) ||
      (o.tipoOT?.nombre ?? '').toLowerCase().includes(q) ||
      (o.categoria?.nombre ?? '').toLowerCase().includes(q)
    )
  })
  const visibles = [...filtradas].sort((a, b) => {
    if (orden === 'numero') return (a.numeroOT ?? 0) - (b.numeroOT ?? 0)
    const fa = a.fechaInicioEstado ?? ''
    const fb = b.fechaInicioEstado ?? ''
    return orden === 'reciente' ? fb.localeCompare(fa) : fa.localeCompare(fb)
  })

  const POR_PAGINA = 15
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA))
  const paginaActual = Math.min(page, totalPaginas - 1)
  const enPagina = visibles.slice(
    paginaActual * POR_PAGINA,
    paginaActual * POR_PAGINA + POR_PAGINA
  )

  const vaciaTotal = lista.length === 0
  const vaciaFiltrada = !vaciaTotal && visibles.length === 0
  const otModal = modal ? lista.find((o) => o.id === modal.id) ?? null : null

  async function trasProgramar() {
    const numero = otModal?.numeroOT
    await recargar()
    setModal(null)
    setMensaje(`OT #${numero ?? ''} programada para ejecución.`)
    setPage(0)
  }

  return (
    <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E4E8EE] bg-white px-5 py-4 shadow-[0_4px_18px_rgba(24,40,62,0.07)]">
          <div className="min-w-[240px]">
            <h1 className="text-2xl font-bold text-[#18283E]">Programación de ejecución</h1>
            <p className="mt-0.5 text-sm text-[#718096]">
              Programa para ejecución las OT devueltas
            </p>
          </div>
          <div
            data-indicadores
            className="flex flex-wrap items-center gap-y-3 divide-x divide-[#E4E8EE]"
          >
            <Indicador
              id="DEVUELTAS"
              icono={Wrench}
              valor={lista.length}
              etiqueta="Devueltas"
              color="#3478C7"
            />
            <Indicador
              id="CON-MATERIALES"
              icono={PackageCheck}
              valor={conMateriales}
              etiqueta="Con materiales"
              color="#27976B"
            />
            <Indicador
              id="DEMORADAS"
              icono={Timer}
              valor={demoradas}
              etiqueta={`+${DIAS_ALERTA} días`}
              color="#D97706"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div
            data-mensaje
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            {mensaje}
          </div>
        )}

        {ots === null && !error && (
          <div className="rounded-xl border border-[#E4E8EE] bg-white p-8 text-center text-sm text-[#718096]">
            Cargando OT devueltas…
          </div>
        )}

        {ots !== null && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#E4E8EE] bg-white px-4 py-3">
            <div className="flex overflow-hidden rounded-lg border border-[#E4E8EE]">
              <button
                type="button"
                data-vista="lista"
                aria-pressed={vista === 'lista'}
                onClick={() => setVista('lista')}
                className={`${CLASE_VISTA} ${
                  vista === 'lista'
                    ? 'bg-[#3478C7] text-white'
                    : 'bg-white text-[#55657A] hover:bg-[#F0F5FB]'
                }`}
              >
                <List size={15} aria-hidden="true" />
                Lista
              </button>
              <button
                type="button"
                data-vista="fichas"
                aria-pressed={vista === 'fichas'}
                onClick={() => setVista('fichas')}
                className={`${CLASE_VISTA} ${
                  vista === 'fichas'
                    ? 'bg-[#3478C7] text-white'
                    : 'bg-white text-[#55657A] hover:bg-[#F0F5FB]'
                } border-l border-[#E4E8EE]`}
              >
                <LayoutGrid size={15} aria-hidden="true" />
                Fichas
              </button>
            </div>

            <div className="relative min-w-[190px] flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]"
                aria-hidden="true"
              />
              <input
                data-buscador
                type="search"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPage(0)
                }}
                placeholder="Buscar por Nº de OT, tipo o categoría…"
                className="w-full rounded-lg border border-[#E4E8EE] py-2 pl-9 pr-3 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
              />
            </div>

            <select
              data-orden
              value={orden}
              onChange={(e) => {
                setOrden(e.target.value)
                setPage(0)
              }}
              className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
            >
              <option value="antigua">Más antiguas primero</option>
              <option value="reciente">Más recientes primero</option>
              <option value="numero">Nº de OT</option>
            </select>

            <span data-resultados className="text-xs font-medium text-[#718096]">
              {visibles.length} resultado{visibles.length === 1 ? '' : 's'}
            </span>

            <PaginacionPanel
              page={paginaActual}
              size={POR_PAGINA}
              total={visibles.length}
              setPage={setPage}
            />
          </div>
        )}

        {ots !== null && (
          <>
            {vaciaTotal && (
              <div
                data-lista-vacia
                className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-10 text-center"
              >
                <Wrench size={40} strokeWidth={1.5} className="mx-auto text-[#A0AEC0]" />
                <p className="mt-3 text-sm font-medium text-[#55657A]">
                  No hay OT devueltas pendientes de programar.
                </p>
              </div>
            )}
            {vaciaFiltrada && (
              <div
                data-lista-vacia
                className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-8 text-center text-sm text-[#718096]"
              >
                Sin resultados con los filtros actuales.
              </div>
            )}

            {visibles.length > 0 && vista === 'lista' && (
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                <div
                  className={`hidden pb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#A6B2C2] sm:grid sm:grid-cols-[104px_minmax(0,1fr)_auto] sm:items-center sm:gap-x-5 sm:pl-4 ${
                    puedeProgramar ? 'sm:pr-[58px]' : 'sm:pr-4'
                  }`}
                >
                  <span>Orden</span>
                  <span>Detalle</span>
                  <span className="text-right">Antigüedad</span>
                </div>

                <div className="space-y-2">
                  {enPagina.map((o) => {
                    const estado = o.estado?.nombre ?? ''
                    const antiguedad = diasDesde(o.fechaInicioEstado)
                    return (
                      <div
                        key={o.id}
                        className="flex items-center gap-2 rounded-xl border border-[#E7ECF3] bg-white py-3 pl-3 pr-2 shadow-[0_1px_2px_rgba(24,40,62,0.04)] transition hover:border-[#CFDFF1] hover:shadow-[0_6px_18px_rgba(24,40,62,0.07)] sm:gap-3 sm:pl-4 sm:pr-2.5"
                      >
                        <button
                          type="button"
                          data-ot-fila={o.id}
                          onClick={() => setModal({ tipo: 'detalle', id: o.id })}
                          className="grid min-w-0 flex-1 appearance-none items-center gap-x-5 gap-y-2 rounded-lg border-0 bg-transparent p-0 text-left text-inherit focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3478C7]/40 focus-visible:ring-offset-2 sm:grid-cols-[104px_minmax(0,1fr)_auto]"
                        >
                          {/* Zona 1 · Identificación de la OT */}
                          <div className="min-w-0">
                            <div className="text-[15px] font-bold leading-none tracking-tight text-[#18283E] tabular-nums">
                              #{o.numeroOT ?? '—'}
                            </div>
                            <div className="mt-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-[#96A2B4]">
                              {o.tipoOT?.nombre || 'Sin tipo'}
                            </div>
                          </div>

                          {/* Zona 2 · Información principal */}
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold leading-snug text-[#18283E]">
                              {o.descripcion || 'Sin descripción'}
                            </div>
                            <div className="mt-0.5 truncate text-[11.5px] text-[#718096]">
                              {o.apellidosNombre || 'Sin cliente'}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <Dato icono={MapPin}>{o.ubicacion || 'Sin ubicación'}</Dato>
                              <Dato icono={Boxes}>{resumenMateriales(o.materiales)}</Dato>
                              {o.categoria?.nombre && (
                                <Dato icono={Tag}>{o.categoria.nombre}</Dato>
                              )}
                            </div>
                          </div>

                          {/* Zona 3 · Estado y tiempo */}
                          <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1.5">
                            <EtiquetaEstado estado={estado} />
                            <ChipAntiguedad dias={antiguedad} />
                          </div>
                        </button>

                        {/* Zona 4 · Acciones */}
                        {puedeProgramar && (
                          <button
                            type="button"
                            data-programar={o.id}
                            onClick={() => setModal({ tipo: 'programar', id: o.id })}
                            title="Programar para ejecución"
                            aria-label="Programar para ejecución"
                            className="inline-flex h-9 w-9 shrink-0 appearance-none items-center justify-center self-center rounded-lg border-0 bg-[#F1F6FC] p-0 text-[#3478C7] shadow-none ring-1 ring-inset ring-[#DCE8F6] transition hover:bg-[#E3EEFA] hover:text-[#2C5FA3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3478C7]/50"
                          >
                            <Wrench size={15} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {visibles.length > 0 && vista === 'fichas' && (
              <div className="grid max-h-[calc(100vh-300px)] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {enPagina.map((o) => {
                  const estado = o.estado?.nombre ?? ''
                  const antiguedad = diasDesde(o.fechaInicioEstado)
                  return (
                    <div
                      key={o.id}
                      className="flex flex-col rounded-xl border border-[#E7ECF3] bg-white p-4 shadow-[0_1px_2px_rgba(24,40,62,0.04)] transition hover:border-[#CFDFF1] hover:shadow-[0_6px_18px_rgba(24,40,62,0.07)]"
                    >
                      <button
                        type="button"
                        data-ot-ficha={o.id}
                        onClick={() => setModal({ tipo: 'detalle', id: o.id })}
                        className="flex-1 appearance-none rounded-lg border-0 bg-transparent p-0 text-left text-inherit focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3478C7]/40 focus-visible:ring-offset-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[17px] font-bold leading-none tracking-tight text-[#18283E] tabular-nums">
                              #{o.numeroOT ?? '—'}
                            </div>
                            <div className="mt-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-[#96A2B4]">
                              {o.tipoOT?.nombre || 'Sin tipo'}
                            </div>
                          </div>
                          <EtiquetaEstado estado={estado} />
                        </div>

                        <div className="mt-3 space-y-1">
                          <div className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-[#18283E]">
                            {o.descripcion || 'Sin descripción'}
                          </div>
                          <div className="truncate text-[11.5px] text-[#718096]">
                            {o.apellidosNombre || 'Sin cliente'}
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Dato icono={MapPin}>{o.ubicacion || 'Sin ubicación'}</Dato>
                          <Dato icono={Boxes}>{resumenMateriales(o.materiales)}</Dato>
                          {o.categoria?.nombre && <Dato icono={Tag}>{o.categoria.nombre}</Dato>}
                        </div>
                      </button>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EEF1F5] pt-3">
                        <ChipAntiguedad dias={antiguedad} />
                        {puedeProgramar && (
                          <button
                            type="button"
                            data-programar={o.id}
                            onClick={() => setModal({ tipo: 'programar', id: o.id })}
                            title="Programar para ejecución"
                            aria-label="Programar para ejecución"
                            className="inline-flex shrink-0 appearance-none items-center gap-1.5 rounded-lg border-0 bg-[#F1F6FC] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#3478C7] shadow-none ring-1 ring-inset ring-[#DCE8F6] transition hover:bg-[#E3EEFA] hover:text-[#2C5FA3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3478C7]/50"
                          >
                            <Wrench size={13} aria-hidden="true" />
                            Programar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {modal?.tipo === 'detalle' && otModal && (
        <ModalDetalle
          ot={otModal}
          onProgramar={() => setModal({ tipo: 'programar', id: otModal.id })}
          onCerrar={() => setModal(null)}
        />
      )}
      {modal?.tipo === 'programar' && otModal && (
        <ModalProgramar
          ot={otModal}
          onCerrar={() => setModal(null)}
          onProgramada={trasProgramar}
        />
      )}
    </main>
  )
}
