import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  LayoutGrid,
  List,
  PackageCheck,
  Plus,
  Search,
  Truck,
} from 'lucide-react'
import { api } from '../api/api'
import Modal from '../components/Modal'
import CalendarioMes from '../components/panel/CalendarioMes'
import { coloresDe, type BaseChip } from '../components/panel/estadosOT'

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
}

interface DetalleProg {
  id: number
  ordenTrabajo: OTInfo
  observacion?: string | null
  fechaCreacion?: string
  entregada?: boolean
}

interface Programacion {
  id: number
  fechaProgramacion: string
  programadoPor?: UsuarioRef | null
  observacion?: string | null
  fechaCreacion?: string
  detalles: DetalleProg[]
}

interface ChipOT extends BaseChip {
  programacionId: number
}

interface DetalleEntrega {
  id: number
  ordenTrabajo?: OTInfo | null
  tecnico?: UsuarioRef | null
  fechaDevolucion?: string | null
  recibidoPor?: UsuarioRef | null
}

interface Entrega {
  id: number
  fechaEntrega: string
  entregadoPor?: UsuarioRef | null
  observacion?: string | null
  fechaCreacion?: string
  detalles: DetalleEntrega[]
}

interface EntregaResp {
  entrega: Entrega
  detalles: DetalleEntrega[]
}

interface Tecnico {
  id: number
  nombres?: string
  apellidos?: string
}

type ModalState =
  | { tipo: 'prog-detalle'; id: number }
  | { tipo: 'nueva-prog' }
  | { tipo: 'agregar'; id: number }
  | { tipo: 'reprogramar'; id: number }
  | { tipo: 'nueva-entrega'; pre?: OTInfo[]; volver?: ModalState }
  | { tipo: 'entrega-detalle'; id: number }
  | { tipo: 'recepcion'; id: number }
  | null

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

function hoyISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function ahoraLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  icono: typeof Truck
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

function Pill({ texto, color }: { texto: string; color: string }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {texto}
    </span>
  )
}

function esPendiente(d: DetalleProg): boolean {
  return d.ordenTrabajo?.estado?.nombre === 'PROGRAMADO'
}

function pillDeOT(d: DetalleProg): { texto: string; color: string } {
  const estado = d.ordenTrabajo?.estado?.nombre ?? ''
  if (estado === 'PROGRAMADO') return { texto: 'Pendiente', color: '#D97706' }
  if (estado === 'ENTREGADO') return { texto: 'Entregada', color: '#27976B' }
  return { texto: estado || '—', color: '#718096' }
}

function ModalDetalleProgramacion({
  prog,
  puedeEditar,
  onCerrar,
  onAgregar,
  onReprogramar,
  onEntregar,
}: {
  prog: Programacion
  puedeEditar: boolean
  onCerrar: () => void
  onAgregar: () => void
  onReprogramar: () => void
  onEntregar: (ots: OTInfo[]) => void
}) {
  const pendientes = prog.detalles.filter(esPendiente)
  return (
    <Modal
      titulo={`Programación del ${fechaCorta(prog.fechaProgramacion) ?? ''}`}
      ancho={600}
      onCerrar={onCerrar}
    >
      <div data-programacion-modal>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#E7F0FB] px-3 py-2">
          <span className="text-sm font-semibold text-[#2C5FA3]">
            {fechaCorta(prog.fechaProgramacion)}
          </span>
          <div className="flex items-center gap-2">
            <Pill texto={`${prog.detalles.length} OT`} color="#3478C7" />
            {pendientes.length > 0 ? (
              <Pill
                texto={`${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}`}
                color="#D97706"
              />
            ) : (
              <Pill texto="Todo entregado" color="#27976B" />
            )}
          </div>
        </div>

        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Datos de la programación
        </h3>
        <dl className="mb-4">
          <Fila label="Fecha" valor={fechaCorta(prog.fechaProgramacion)} />
          <Fila label="Programada por" valor={nombreDe(prog.programadoPor)} />
          <Fila label="Observación" valor={prog.observacion} />
          <Fila label="Creada" valor={fechaHora(prog.fechaCreacion)} />
        </dl>

        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Órdenes programadas
        </h3>
        {prog.detalles.length === 0 ? (
          <p
            data-detalle-vacio
            className="rounded-lg border border-dashed border-[#CBD5E0] p-4 text-center text-xs text-[#718096]"
          >
            Sin OTs aún — usa “Agregar OTs” para añadirlas.
          </p>
        ) : (
          <div className="mb-4 overflow-hidden rounded-lg border border-[#E4E8EE]">
            {prog.detalles.map((d) => {
              const pill = pillDeOT(d)
              return (
                <div
                  key={d.id}
                  data-detalle-ot={d.ordenTrabajo.numeroOT}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#EEF1F5] px-3 py-2 last:border-b-0"
                >
                  <span className="w-[70px] shrink-0 text-sm font-bold text-[#18283E]">
                    #{d.ordenTrabajo.numeroOT}
                  </span>
                  <span className="min-w-[120px] flex-1 truncate text-xs text-[#55657A]">
                    {d.ordenTrabajo.tipoOT?.nombre || 'Sin tipo'}
                  </span>
                  <BadgeEstado estado={d.ordenTrabajo.estado?.nombre ?? ''} />
                  <Pill texto={pill.texto} color={pill.color} />
                </div>
              )
            })}
          </div>
        )}

        {puedeEditar && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-[#EEF1F5] pt-4">
            <button type="button" data-agregar-ots className="btn-secundario" onClick={onAgregar}>
              <Plus size={14} aria-hidden="true" /> Agregar OTs
            </button>
            {pendientes.length > 0 && (
              <>
                <button
                  type="button"
                  data-entregar
                  className="btn-secundario"
                  onClick={() => onEntregar(pendientes.map((d) => d.ordenTrabajo))}
                >
                  <Truck size={14} aria-hidden="true" /> Entregar
                </button>
                <button type="button" data-reprogramar className="btn" onClick={onReprogramar}>
                  <CalendarDays size={14} aria-hidden="true" /> Reprogramar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function ModalNuevaProgramacion({
  onCerrar,
  onCreada,
}: {
  onCerrar: () => void
  onCreada: (id: number) => void
}) {
  const [fecha, setFecha] = useState(hoyISO())
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!fecha) {
      setError('Indica la fecha de la programación')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const nueva = (await api.post('/programaciones', {
        fechaProgramacion: fecha,
        observacion,
      })) as { id: number }
      onCreada(nueva.id)
    } catch (err) {
      setError((err as Error).message || 'No se pudo crear la programación')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Nueva programación" ancho={460} onCerrar={onCerrar}>
      <div data-nueva-form className="space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
            Fecha
          </span>
          <input
            data-nueva-fecha
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
            Observación
          </span>
          <textarea
            data-nueva-obs
            rows={3}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Ej: Ruta norte"
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
          />
        </label>
        {error && (
          <div
            data-nueva-error
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" data-nueva-cancelar className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            data-nueva-enviar
            className="btn"
            disabled={enviando}
            onClick={enviar}
          >
            {enviando ? 'Creando…' : 'Crear programación'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ModalAgregar({
  prog,
  onCerrar,
  onListo,
}: {
  prog: Programacion
  onCerrar: () => void
  onListo: () => void
}) {
  const [disponibles, setDisponibles] = useState<OTInfo[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState<number[]>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vivo = true
    api
      .get('/ordenes-trabajo/disponibles')
      .then((lista: OTInfo[]) => {
        if (vivo) setDisponibles(lista)
      })
      .catch((err: Error) => {
        if (vivo) {
          setDisponibles([])
          setError(err.message || 'No se pudieron cargar las OTs disponibles')
        }
      })
    return () => {
      vivo = false
    }
  }, [])

  const visibles = (disponibles ?? []).filter(
    (ot) => !busqueda || String(ot.numeroOT ?? '').includes(busqueda.trim())
  )

  function alternar(id: number) {
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function enviar() {
    setEnviando(true)
    setError('')
    try {
      await api.post(`/programaciones/${prog.id}/ordenes`, { ordenIds: seleccion })
      onListo()
    } catch (err) {
      setError((err as Error).message || 'No se pudieron agregar las OTs')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={`Agregar OTs — ${fechaCorta(prog.fechaProgramacion) ?? ''}`} ancho={520} onCerrar={onCerrar}>
      <div data-agregar-form className="space-y-3">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]"
            aria-hidden="true"
          />
          <input
            data-agregar-buscador
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por Nº de OT"
            className="w-full rounded-lg border border-[#E4E8EE] py-2 pl-9 pr-3 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
          />
        </div>

        {disponibles === null && !error && (
          <p className="text-sm text-[#718096]">Cargando OTs disponibles…</p>
        )}

        {disponibles !== null && disponibles.length === 0 && (
          <div
            data-agregar-vacio
            className="rounded-lg border border-dashed border-[#CBD5E0] p-5 text-center text-sm text-[#718096]"
          >
            No hay OTs disponibles para programar.
          </div>
        )}

        {disponibles !== null && disponibles.length > 0 && visibles.length === 0 && (
          <p className="rounded-lg border border-dashed border-[#CBD5E0] p-4 text-center text-xs text-[#718096]">
            Sin resultados para “{busqueda}”.
          </p>
        )}

        {visibles.length > 0 && (
          <div className="max-h-[280px] overflow-y-auto rounded-lg border border-[#E4E8EE]">
            {visibles.map((ot) => {
              const marcada = seleccion.includes(ot.id)
              return (
                <label
                  key={ot.id}
                  data-ot-check={ot.id}
                  className={`flex cursor-pointer items-center gap-3 border-b border-[#EEF1F5] px-3 py-2 last:border-b-0 transition ${
                    marcada ? 'bg-[#EDF4FC]' : 'hover:bg-[#F0F5FB]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => alternar(ot.id)}
                    className="h-4 w-4 shrink-0 accent-[#3478C7]"
                  />
                  <span className="w-[70px] shrink-0 text-sm font-bold text-[#18283E]">
                    #{ot.numeroOT}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-[#55657A]">
                    {ot.tipoOT?.nombre || 'Sin tipo'}
                  </span>
                  <span className="truncate text-[11px] text-[#718096]">
                    {ot.ubicacion || '—'}
                  </span>
                </label>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span data-agregar-seleccionados className="text-xs font-medium text-[#718096]">
            {seleccion.length} seleccionada{seleccion.length === 1 ? '' : 's'}
          </span>
          {error && (
            <span data-agregar-error className="text-xs font-medium text-red-600">
              {error}
            </span>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" data-agregar-cancelar className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            data-agregar-enviar
            className="btn"
            disabled={enviando || seleccion.length === 0}
            onClick={enviar}
          >
            {enviando ? 'Agregando…' : `Agregar${seleccion.length > 0 ? ` (${seleccion.length})` : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ModalReprogramar({
  prog,
  onCerrar,
  onCreada,
}: {
  prog: Programacion
  onCerrar: () => void
  onCreada: (id: number) => void
}) {
  const pendientes = prog.detalles.filter(esPendiente)
  const [fecha, setFecha] = useState(hoyISO())
  const [observacion, setObservacion] = useState(prog.observacion ?? '')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!fecha) {
      setError('Indica la nueva fecha')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const nueva = (await api.post('/programaciones', {
        fechaProgramacion: fecha,
        observacion,
      })) as { id: number }
      await api.post(`/programaciones/${nueva.id}/ordenes`, {
        ordenIds: pendientes.map((d) => d.ordenTrabajo.id),
      })
      onCreada(nueva.id)
    } catch (err) {
      setError((err as Error).message || 'No se pudo reprogramar')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={`Reprogramar — ${fechaCorta(prog.fechaProgramacion) ?? ''}`} ancho={460} onCerrar={onCerrar}>
      <div data-reprogramar-form className="space-y-3">
        <p className="text-sm text-[#55657A]">
          {pendientes.length === 1 ? (
            <>La OT pendiente se moverá a una nueva programación del </>
          ) : (
            <>
              Las <strong>{pendientes.length}</strong> OTs pendientes se moverán a una nueva
              programación del{' '}
            </>
          )}
          <strong>{fechaCorta(prog.fechaProgramacion)}</strong>:
        </p>
        <div className="rounded-lg border border-[#E4E8EE] bg-[#F8FAFC] px-3 py-2 text-xs text-[#55657A]">
          {pendientes.map((d) => `#${d.ordenTrabajo.numeroOT}`).join(', ')}
        </div>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
            Nueva fecha
          </span>
          <input
            data-reprogramar-fecha
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
            Observación
          </span>
          <textarea
            data-reprogramar-obs
            rows={2}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
          />
        </label>
        {error && (
          <div
            data-reprogramar-error
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            data-reprogramar-cancelar
            className="btn-secundario"
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button
            type="button"
            data-reprogramar-enviar
            className="btn"
            disabled={enviando || pendientes.length === 0}
            onClick={enviar}
          >
            {enviando ? 'Reprogramando…' : 'Reprogramar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ModalNuevaEntrega({
  pre,
  tecnicos,
  onCerrar,
  onCreada,
}: {
  pre?: OTInfo[]
  tecnicos: Tecnico[]
  onCerrar: () => void
  onCreada: (id: number) => void
}) {
  const esPre = (pre?.length ?? 0) > 0
  const [origen, setOrigen] = useState<OTInfo[]>(pre ?? [])
  const [disponibles, setDisponibles] = useState<OTInfo[] | null>(esPre ? [] : null)
  const [filas, setFilas] = useState<{ ordenId: number; tecnicoId: string }[]>(
    (pre ?? []).map((o) => ({ ordenId: o.id, tecnicoId: '' }))
  )
  const [busqueda, setBusqueda] = useState('')
  const [fecha, setFecha] = useState(ahoraLocal())
  const [tecnicoGeneral, setTecnicoGeneral] = useState('')
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (esPre) return
    let vivo = true
    api
      .get('/ordenes-trabajo/disponibles')
      .then((lista: OTInfo[]) => {
        if (vivo) {
          setDisponibles(lista)
          setOrigen(lista)
        }
      })
      .catch((err: Error) => {
        if (vivo) {
          setDisponibles([])
          setError(err.message || 'No se pudieron cargar las OTs disponibles')
        }
      })
    return () => {
      vivo = false
    }
  }, [esPre])

  const catalogo = disponibles ?? []
  const disponiblesVisibles = catalogo.filter((o) => {
    if (filas.some((f) => f.ordenId === o.id)) return false
    if (!busqueda) return true
    const q = busqueda.trim().toLowerCase()
    return (
      String(o.numeroOT ?? '').includes(q) ||
      (o.tipoOT?.nombre ?? '').toLowerCase().includes(q) ||
      (o.descripcion ?? '').toLowerCase().includes(q)
    )
  })

  function toggleOT(id: number) {
    setFilas((prev) =>
      prev.some((f) => f.ordenId === id)
        ? prev.filter((f) => f.ordenId !== id)
        : [...prev, { ordenId: id, tecnicoId: '' }]
    )
  }

  function setTecnicoFila(id: number, tecnicoId: string) {
    setFilas((prev) =>
      prev.map((f) => (f.ordenId === id ? { ...f, tecnicoId } : f))
    )
  }

  const resueltas = filas.filter((f) => f.tecnicoId || tecnicoGeneral)

  async function enviar() {
    if (filas.length === 0) {
      setError('Seleccione al menos una OT para entregar')
      return
    }
    if (resueltas.length !== filas.length) {
      setError('Asigna un técnico general o uno individual para cada OT')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const res = (await api.post('/entregas', {
        observacion,
        fecha,
        detalles: filas.map((f) => ({
          ordenId: f.ordenId,
          tecnicoId: Number(f.tecnicoId || tecnicoGeneral),
        })),
      })) as { entrega: { id: number } }
      onCreada(res.entrega.id)
    } catch (err) {
      setError((err as Error).message || 'No se pudo registrar la entrega')
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={esPre ? 'Entregar OTs de la programación' : 'Registrar entrega'}
      ancho={900}
      onCerrar={onCerrar}
    >
      <div data-entrega-form className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3">
            <div className="rounded-lg border border-[#E4E8EE] px-3 py-2.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
                Fecha
              </label>
              <input
                data-entrega-fecha
                type="datetime-local"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
              />
              <p className="mt-1.5 text-[11px] text-[#718096]">Por defecto la fecha y hora actual</p>
            </div>

            <div className="rounded-lg border border-[#E4E8EE] px-3 py-2.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
                Técnico general
              </label>
              <select
                data-entrega-tecnico-general
                value={tecnicoGeneral}
                onChange={(e) => setTecnicoGeneral(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
              >
                <option value="">(sin técnico general)</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombres} {t.apellidos}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-[#718096]">Se aplica a todas las OTs seleccionadas</p>
            </div>

            <div className="rounded-lg border border-[#E4E8EE] px-3 py-2.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
                Observación
              </label>
              <textarea
                data-entrega-obs
                rows={4}
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Ej: Ruta norte"
                className="mt-1 w-full resize-y rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
              />
            </div>
          </div>

          <div className="space-y-3">
            {!esPre && (
              <div className="rounded-lg border border-[#E4E8EE] px-3 py-2.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  OTs a entregar (estado PROGRAMADO)
                </label>
                <input
                  data-entrega-buscador
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por número OT, tipo o descripción…"
                  className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
                />
                <div className="mt-2 max-h-[190px] overflow-y-auto">
                  {disponibles === null && !error && (
                    <p className="py-1 text-[13px] text-[#718096]">Cargando OTs disponibles…</p>
                  )}
                  {disponibles !== null && disponibles.length === 0 && (
                    <p className="py-1 text-[13px] text-[#718096]">
                      No hay OT en estado PROGRAMADO disponibles
                    </p>
                  )}
                  {disponibles !== null && disponibles.length > 0 && disponiblesVisibles.length === 0 && (
                    <p className="py-1 text-[13px] text-[#718096]">
                      {busqueda ? `Sin resultados para “${busqueda}”` : 'Todas las OT disponibles ya están seleccionadas'}
                    </p>
                  )}
                  {disponiblesVisibles.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      data-entrega-check={o.id}
                      onClick={() => toggleOT(o.id)}
                      className="flex w-full items-center gap-3 border-b border-[#EEF1F5] px-1 py-2 text-left transition last:border-b-0 hover:bg-[#F0F5FB]"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[#55657A]">
                        <strong className="font-bold text-[#18283E]">#{o.numeroOT}</strong> — {o.tipoOT?.nombre}
                        {o.descripcion && <span className="text-[#718096]"> — {o.descripcion}</span>}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-[#3478C7]">+ Agregar</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-[#E4E8EE] px-3 py-2.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
                OTs seleccionadas ({filas.length})
              </label>
              <div className="mt-1 max-h-[190px] overflow-y-auto">
                {filas.length === 0 && (
                  <p className="py-1 text-[13px] text-[#718096]">
                    Ninguna OT seleccionada aún — haz clic en “+ Agregar”
                  </p>
                )}
                {filas.map((f) => {
                  const o = origen.find((x) => x.id === f.ordenId)
                  const general = tecnicos.find((t) => String(t.id) === String(tecnicoGeneral))
                  return (
                    <div
                      key={f.ordenId}
                      data-entrega-fila-sel={f.ordenId}
                      className="flex items-center gap-2 border-b border-[#EEF1F5] py-2 text-[13px] last:border-b-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-[#55657A]">
                        <strong className="font-bold text-[#18283E]">#{o?.numeroOT}</strong> — {o?.tipoOT?.nombre}
                        {o?.descripcion && <span className="text-[#718096]"> — {o.descripcion}</span>}
                      </span>
                      <select
                        data-entrega-tecnico-fila={f.ordenId}
                        value={f.tecnicoId}
                        onChange={(e) => setTecnicoFila(f.ordenId, e.target.value)}
                        title="Técnico individual (opcional)"
                        className="w-[170px] shrink-0 rounded-lg border border-[#E4E8EE] bg-white px-2 py-1 text-xs text-[#18283E] outline-none focus:border-[#3478C7]"
                      >
                        <option value="">
                          {general ? `General: ${general.nombres} ${general.apellidos}` : '(elegir técnico)'}
                        </option>
                        {tecnicos.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombres} {t.apellidos}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        data-entrega-quitar={f.ordenId}
                        onClick={() => toggleOT(f.ordenId)}
                        title="Quitar de la selección"
                        className="btn btn-secundario btn-chico shrink-0 px-2 py-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div data-entrega-contador className="text-[13px] text-[#718096]">
          {filas.length} OT seleccionada(s) · {resueltas.length} con técnico asignado
          {!tecnicoGeneral && filas.length > 0 && resueltas.length !== filas.length && (
            <span className="text-red-600"> · faltan técnicos</span>
          )}
        </div>

        {error && (
          <div
            data-entrega-error
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[#EEF1F5] pt-4">
          <button type="button" data-entrega-cancelar className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            data-entrega-enviar
            className="btn"
            disabled={enviando || filas.length === 0 || resueltas.length !== filas.length}
            onClick={enviar}
          >
            {enviando ? 'Registrando…' : 'Registrar entrega'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ModalDetalleEntrega({ id, onCerrar }: { id: number; onCerrar: () => void }) {
  const [resp, setResp] = useState<EntregaResp | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    api
      .get(`/entregas/${id}`)
      .then((data: EntregaResp) => {
        if (vivo) setResp(data)
      })
      .catch((err: Error) => {
        if (vivo) setError(err.message || 'No se pudo cargar la entrega')
      })
    return () => {
      vivo = false
    }
  }, [id])

  if (error) {
    return (
      <Modal titulo={`Entrega #${id}`} ancho={820} onCerrar={onCerrar}>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      </Modal>
    )
  }

  if (!resp) {
    return (
      <Modal titulo={`Entrega #${id}`} ancho={820} onCerrar={onCerrar}>
        <p className="text-sm text-[#718096]">Cargando entrega…</p>
      </Modal>
    )
  }

  const pendientes = resp.detalles.filter(
    (d) => d.ordenTrabajo?.estado?.nombre === 'ENTREGADO'
  ).length

  return (
    <Modal
      titulo={`Detalle — entrega #${resp.entrega.id}`}
      ancho={820}
      onCerrar={onCerrar}
    >
      <div data-entrega-modal>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#EDF4FC] px-3 py-2">
          <span className="text-sm font-semibold text-[#2C5FA3]">
            {fechaHora(resp.entrega.fechaEntrega)}
          </span>
          <div className="flex items-center gap-2">
            <Pill texto={`${resp.detalles.length} OT`} color="#3478C7" />
            {pendientes > 0 ? (
              <Pill
                texto={`${pendientes} sin recepción`}
                color="#D97706"
              />
            ) : (
              <Pill texto="Recepción al día" color="#27976B" />
            )}
          </div>
        </div>

        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Datos de la entrega
        </h3>
        <dl className="mb-4">
          <Fila label="Fecha" valor={fechaHora(resp.entrega.fechaEntrega)} />
          <Fila label="Entregada por" valor={nombreDe(resp.entrega.entregadoPor)} />
          <Fila label="Observación" valor={resp.entrega.observacion} />
          <Fila label="Creada" valor={fechaHora(resp.entrega.fechaCreacion)} />
        </dl>

        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Órdenes de la entrega
        </h3>
        {resp.detalles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#CBD5E0] p-4 text-center text-xs text-[#718096]">
            Sin detalles
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#E4E8EE]">
            <div className="hidden bg-[#F4F6F9] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#718096] sm:grid sm:grid-cols-[80px_1fr_110px_1fr_120px_120px] sm:gap-2">
              <span>OT</span>
              <span>Técnico</span>
              <span>Estado</span>
              <span>Ubicación</span>
              <span>Devolución</span>
              <span>Recepción</span>
            </div>
            {resp.detalles.map((d) => (
              <div
                key={d.id}
                data-entrega-detalle-ot={d.ordenTrabajo?.numeroOT}
                className="flex flex-wrap items-center gap-2 border-b border-[#EEF1F5] px-3 py-2 text-xs text-[#55657A] last:border-b-0 sm:flex-nowrap sm:grid sm:grid-cols-[80px_1fr_110px_1fr_120px_120px]"
              >
                <span className="font-bold text-[#18283E]">#{d.ordenTrabajo?.numeroOT}</span>
                <span className="truncate">{nombreDe(d.tecnico) ?? '—'}</span>
                <BadgeEstado estado={d.ordenTrabajo?.estado?.nombre ?? ''} />
                <span className="truncate">{d.ordenTrabajo?.ubicacion || '—'}</span>
                <span>{d.fechaDevolucion ? fechaHora(d.fechaDevolucion) : '—'}</span>
                <span>{d.recibidoPor ? nombreDe(d.recibidoPor) : 'Pendiente'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function ModalRecepcion({
  id,
  onCerrar,
  onConfirmado,
}: {
  id: number
  onCerrar: () => void
  onConfirmado: () => void
}) {
  const [resp, setResp] = useState<EntregaResp | null>(null)
  const [sel, setSel] = useState<number[]>([])
  const [ubics, setUbics] = useState<Record<number, string>>({})
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vivo = true
    api
      .get(`/entregas/${id}`)
      .then((data: EntregaResp) => {
        if (vivo) setResp(data)
      })
      .catch((err: Error) => {
        if (vivo) setError(err.message || 'No se pudo cargar la entrega')
      })
    return () => {
      vivo = false
    }
  }, [id])

  function alternar(detalleId: number) {
    setSel((prev) => {
      const estaba = prev.includes(detalleId)
      if (estaba) {
        setUbics((u) => {
          const copia = { ...u }
          delete copia[detalleId]
          return copia
        })
        return prev.filter((x) => x !== detalleId)
      }
      return [...prev, detalleId]
    })
  }

  async function confirmar() {
    if (sel.length === 0) {
      setError('Seleccione al menos una OT para recibir')
      return
    }
    const sinUbicacion = sel.filter((d) => !(ubics[d] || '').trim())
    if (sinUbicacion.length > 0 && resp) {
      const numeros = resp.detalles
        .filter((d) => sinUbicacion.includes(d.id))
        .map((d) => `#${d.ordenTrabajo?.numeroOT}`)
        .join(', ')
      setError(`Debe indicar la ubicación de: ${numeros}`)
      return
    }
    setEnviando(true)
    setError('')
    try {
      await api.post(`/entregas/${id}/recepcion`, {
        detalleIds: sel,
        observacion: observacion || 'Recepción confirmada',
        ubicaciones: Object.fromEntries(
          sel.map((d) => [d, (ubics[d] || '').trim()])
        ),
      })
      onConfirmado()
    } catch (err) {
      setError((err as Error).message || 'No se pudo confirmar la recepción')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={`Confirmar recepción — entrega #${id}`} ancho={700} onCerrar={onCerrar}>
      <div data-recepcion-form className="space-y-3">
        <p className="text-sm text-[#55657A]">
          Seleccione las OT que se le entregaron e indique la ubicación de cada una. Las demás
          permanecerán sin cambios.
        </p>

        {!resp && !error && <p className="text-sm text-[#718096]">Cargando entrega…</p>}

        {resp && (
          <div className="max-h-[300px] overflow-y-auto rounded-lg border border-[#E4E8EE] p-2">
            {resp.detalles.length === 0 && (
              <p className="p-2 text-[13px] text-[#718096]">No hay OT en esta entrega</p>
            )}
            {resp.detalles.map((d) => {
              const recibible =
                d.ordenTrabajo?.estado?.nombre === 'ENTREGADO' && !d.recibidoPor
              const marcada = sel.includes(d.id)
              return (
                <div
                  key={d.id}
                  data-recepcion-ot={d.id}
                  className={`mb-2 border-b border-[#EEF1F5] pb-2 text-[13px] last:mb-0 last:border-b-0 ${
                    recibible ? '' : 'opacity-50'
                  }`}
                >
                  <label
                    className={`flex items-center gap-2.5 ${
                      recibible ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      disabled={!recibible}
                      onChange={() => alternar(d.id)}
                      className="h-4 w-4 shrink-0 accent-[#3478C7]"
                    />
                    <span className="min-w-0 flex-1 truncate text-[#55657A]">
                      <strong className="font-bold text-[#18283E]">
                        #{d.ordenTrabajo?.numeroOT}
                      </strong>{' '}
                      — {d.ordenTrabajo?.tipoOT?.nombre}
                      {d.ordenTrabajo?.descripcion && (
                        <span className="text-[#718096]"> — {d.ordenTrabajo.descripcion}</span>
                      )}
                    </span>
                    {!recibible && (
                      <span className="shrink-0 text-[11px] text-[#718096]">
                        {d.recibidoPor ? 'ya recibida' : `estado ${d.ordenTrabajo?.estado?.nombre || '—'}`}
                      </span>
                    )}
                  </label>
                  {marcada && (
                    <div className="mt-1.5 pl-7">
                      <span className="block text-[11px] text-[#718096]">
                        Ubicación de la OT
                      </span>
                      <input
                        data-recepcion-ubic={d.id}
                        value={ubics[d.id] || ''}
                        onChange={(e) =>
                          setUbics((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                        placeholder="Ej: Bodega central"
                        className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-1.5 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
            Observación (opcional)
          </span>
          <input
            data-recepcion-obs
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Ej: Recepción en almacén"
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
          />
        </label>

        {error && (
          <div
            data-recepcion-error
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[#EEF1F5] pt-4">
          <button
            type="button"
            data-recepcion-cancelar
            className="btn-secundario"
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button
            type="button"
            data-recepcion-enviar
            className="btn"
            disabled={enviando || sel.length === 0}
            onClick={confirmar}
          >
            {enviando
              ? 'Confirmando…'
              : `Confirmar recepción${sel.length > 0 ? ` (${sel.length})` : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

const CLASE_VISTA =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40'

export default function EntregasPanel() {
  const usuario = api.getUsuario()
  const puedeEditar = usuario?.rol === 'FACTIBILIZADOR'

  const [progs, setProgs] = useState<Programacion[] | null>(null)
  const [entregas, setEntregas] = useState<Entrega[] | null>(null)
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [vista, setVista] = useState<'calendario' | 'entregas'>('calendario')
  const [subvista, setSubvista] = useState<'lista' | 'fichas'>('lista')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('reciente')
  const [modal, setModal] = useState<ModalState>(null)

  const hoy = useMemo(() => new Date(), [])
  const [anio, setAnio] = useState(() => hoy.getFullYear())
  const [mes, setMes] = useState(() => hoy.getMonth())

  async function recargar() {
    try {
      const [p, e] = await Promise.all([
        api.get('/programaciones'),
        api.get('/entregas'),
      ])
      setProgs(p as Programacion[])
      setEntregas(e as Entrega[])
      setError('')
    } catch (err) {
      setError((err as Error).message || 'No se pudieron cargar los datos')
    }
  }

  useEffect(() => {
    recargar()
    api
      .get('/usuarios/tecnicos')
      .then((t: Tecnico[]) => setTecnicos(t))
      .catch(() => setTecnicos([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const datos = useMemo(() => {
    const acc: Record<string, ChipOT[]> = {}
    for (const p of progs ?? []) {
      const clave = p.fechaProgramacion.slice(0, 10)
      for (const d of p.detalles ?? []) {
        if (!acc[clave]) acc[clave] = []
        acc[clave].push({
          numeroOT: d.ordenTrabajo.numeroOT ?? 0,
          estado: d.ordenTrabajo.estado?.nombre ?? '',
          programacionId: p.id,
        })
      }
    }
    return acc
  }, [progs])

  const tituloMes = new Date(anio, mes, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  })

  const listaEntregas = entregas ?? []
  const totalPendientesEntregar = new Set(
    (progs ?? [])
      .flatMap((p) => p.detalles)
      .filter((d) => d.ordenTrabajo?.estado?.nombre === 'PROGRAMADO')
      .map((d) => d.ordenTrabajo.id)
  ).size
  const totalSinRecepcion = listaEntregas.reduce(
    (n, e) =>
      n + e.detalles.filter((d) => d.ordenTrabajo?.estado?.nombre === 'ENTREGADO').length,
    0
  )

  const filtradas = listaEntregas.filter((e) => {
    if (!busqueda) return true
    const q = busqueda.trim().toLowerCase()
    return (
      String(e.id).includes(q) ||
      (e.observacion ?? '').toLowerCase().includes(q) ||
      (nombreDe(e.entregadoPor) ?? '').toLowerCase().includes(q) ||
      e.detalles.some((d) => String(d.ordenTrabajo?.numeroOT ?? '').includes(q))
    )
  })
  const visibles = [...filtradas].sort((a, b) =>
    orden === 'antigua'
      ? (a.fechaEntrega ?? '').localeCompare(b.fechaEntrega ?? '')
      : (b.fechaEntrega ?? '').localeCompare(a.fechaEntrega ?? '')
  )

  const conRecepcionPendiente = (e: Entrega) =>
    e.detalles.some((d) => d.ordenTrabajo?.estado?.nombre === 'ENTREGADO')
  const nRecepcionPendiente = (e: Entrega) =>
    e.detalles.filter((d) => d.ordenTrabajo?.estado?.nombre === 'ENTREGADO').length

  const progId =
    modal &&
    (modal.tipo === 'prog-detalle' || modal.tipo === 'agregar' || modal.tipo === 'reprogramar')
      ? modal.id
      : null
  const progModal =
    progId != null ? (progs ?? []).find((p) => p.id === progId) ?? null : null

  async function trasCrearProg(id: number) {
    await recargar()
    setModal({ tipo: 'prog-detalle', id })
  }

  async function trasEntregaCreada(id: number) {
    await recargar()
    setOk('Entrega registrada correctamente')
    setModal({ tipo: 'entrega-detalle', id })
  }

  async function trasRecepcion() {
    await recargar()
    setOk('Recepción confirmada correctamente')
    setModal(null)
  }

  return (
    <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E4E8EE] bg-white px-5 py-4 shadow-[0_4px_18px_rgba(24,40,62,0.07)]">
          <div className="min-w-[240px]">
            <h1 className="text-2xl font-bold text-[#18283E]">Entregas</h1>
            <p className="mt-0.5 text-sm text-[#718096]">
              Programación, entregas y recepción de OT
            </p>
          </div>
          <div data-indicadores className="flex flex-wrap items-center gap-y-3 divide-x divide-[#E4E8EE]">
            <Indicador
              id="ENTREGAS"
              icono={Truck}
              valor={listaEntregas.length}
              etiqueta="Entregas"
              color="#3478C7"
            />
            <Indicador
              id="PROGRAMADAS"
              icono={CalendarDays}
              valor={totalPendientesEntregar}
              etiqueta="Pend. entregar"
              color="#718096"
            />
            <Indicador
              id="PENDIENTES"
              icono={PackageCheck}
              valor={totalSinRecepcion}
              etiqueta="Sin recepción"
              color="#D97706"
            />
          </div>
        </div>

        {error && (
          <div
            data-error
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {ok && (
          <div
            data-ok
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {ok}
          </div>
        )}

        {(progs === null || entregas === null) && !error && (
          <div className="rounded-xl border border-[#E4E8EE] bg-white p-8 text-center text-sm text-[#718096]">
            Cargando entregas y programaciones…
          </div>
        )}

        {progs !== null && entregas !== null && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#E4E8EE] bg-white px-4 py-3">
            <div className="flex overflow-hidden rounded-lg border border-[#E4E8EE]">
              <button
                type="button"
                data-vista="calendario"
                aria-pressed={vista === 'calendario'}
                onClick={() => setVista('calendario')}
                className={`${CLASE_VISTA} ${
                  vista === 'calendario'
                    ? 'bg-[#3478C7] text-white'
                    : 'bg-white text-[#55657A] hover:bg-[#F0F5FB]'
                }`}
              >
                <CalendarDays size={15} aria-hidden="true" />
                Calendario
              </button>
              <button
                type="button"
                data-vista="entregas"
                aria-pressed={vista === 'entregas'}
                onClick={() => setVista('entregas')}
                className={`${CLASE_VISTA} border-l border-[#E4E8EE] ${
                  vista === 'entregas'
                    ? 'bg-[#3478C7] text-white'
                    : 'bg-white text-[#55657A] hover:bg-[#F0F5FB]'
                }`}
              >
                <Truck size={15} aria-hidden="true" />
                Entregas
              </button>
            </div>

            {vista === 'calendario' && puedeEditar && (
              <button
                type="button"
                data-nueva-programacion
                className="btn ml-auto"
                onClick={() => setModal({ tipo: 'nueva-prog' })}
              >
                <Plus size={15} aria-hidden="true" />
                Nueva programación
              </button>
            )}

            {vista === 'entregas' && (
              <>
                <div className="flex overflow-hidden rounded-lg border border-[#E4E8EE]">
                  <button
                    type="button"
                    data-subvista="lista"
                    aria-pressed={subvista === 'lista'}
                    onClick={() => setSubvista('lista')}
                    className={`${CLASE_VISTA} ${
                      subvista === 'lista'
                        ? 'bg-[#3478C7] text-white'
                        : 'bg-white text-[#55657A] hover:bg-[#F0F5FB]'
                    }`}
                  >
                    <List size={15} aria-hidden="true" />
                    Lista
                  </button>
                  <button
                    type="button"
                    data-subvista="fichas"
                    aria-pressed={subvista === 'fichas'}
                    onClick={() => setSubvista('fichas')}
                    className={`${CLASE_VISTA} border-l border-[#E4E8EE] ${
                      subvista === 'fichas'
                        ? 'bg-[#3478C7] text-white'
                        : 'bg-white text-[#55657A] hover:bg-[#F0F5FB]'
                    }`}
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
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por Nº de OT, observación o técnico…"
                    className="w-full rounded-lg border border-[#E4E8EE] py-2 pl-9 pr-3 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
                  />
                </div>

                <select
                  data-orden
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
                >
                  <option value="reciente">Más reciente</option>
                  <option value="antigua">Más antigua</option>
                </select>

                <span data-resultados className="text-xs font-medium text-[#718096]">
                  {visibles.length} resultado{visibles.length === 1 ? '' : 's'}
                </span>

                {puedeEditar && (
                  <button
                    type="button"
                    data-nueva-entrega
                    className="btn ml-auto"
                    onClick={() => setModal({ tipo: 'nueva-entrega' })}
                  >
                    <Plus size={15} aria-hidden="true" />
                    Nueva entrega
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {progs !== null && entregas !== null && vista === 'calendario' && (
          <CalendarioMes<ChipOT>
            anio={anio}
            mes={mes}
            hoy={hoy}
            datos={datos}
            tituloMes={tituloMes}
            onAnterior={() => {
              if (mes === 0) {
                setMes(11)
                setAnio((a) => a - 1)
              } else {
                setMes((m) => m - 1)
              }
            }}
            onSiguiente={() => {
              if (mes === 11) {
                setMes(0)
                setAnio((a) => a + 1)
              } else {
                setMes((m) => m + 1)
              }
            }}
            onHoy={() => {
              setAnio(hoy.getFullYear())
              setMes(hoy.getMonth())
            }}
            onSeleccionar={(chip) =>
              setModal({ tipo: 'prog-detalle', id: chip.programacionId })
            }
          />
        )}

        {progs !== null && entregas !== null && vista === 'entregas' && (
          <>
            {listaEntregas.length === 0 && (
              <div
                data-lista-vacia
                className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-10 text-center"
              >
                <Truck size={40} strokeWidth={1.5} className="mx-auto text-[#A0AEC0]" />
                <p className="mt-3 text-sm font-medium text-[#55657A]">
                  Aún no hay entregas registradas.
                </p>
              </div>
            )}
            {listaEntregas.length > 0 && visibles.length === 0 && (
              <div
                data-lista-vacia
                className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-8 text-center text-sm text-[#718096]"
              >
                Sin resultados con los filtros actuales.
              </div>
            )}

            {visibles.length > 0 && subvista === 'lista' && (
              <div className="overflow-hidden rounded-xl border border-[#E4E8EE] bg-white">
                {visibles.map((e) => {
                  const pendientes = conRecepcionPendiente(e)
                  return (
                    <div
                      key={e.id}
                      data-entrega-fila={e.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setModal({ tipo: 'entrega-detalle', id: e.id })}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') setModal({ tipo: 'entrega-detalle', id: e.id })
                      }}
                      className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#EEF1F5] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#F0F5FB] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#3478C7]/40"
                    >
                      <div className="w-[150px] shrink-0">
                        <div className="text-base font-bold leading-tight text-[#18283E]">
                          Entrega #{e.id}
                        </div>
                        <div className="text-[11px] text-[#718096]">
                          {fechaHora(e.fechaEntrega)}
                        </div>
                      </div>
                      <div className="min-w-[140px] flex-1 truncate text-xs text-[#55657A]">
                        <span className="font-medium text-[#718096]">Entregada por: </span>
                        {nombreDe(e.entregadoPor) ?? '—'}
                      </div>
                      <Pill texto={`${e.detalles.length} OT`} color="#3478C7" />
                      {pendientes && (
                        <Pill
                          texto={`${nRecepcionPendiente(e)} sin recepción`}
                          color="#D97706"
                        />
                      )}
                      <div className="hidden max-w-[220px] flex-1 truncate text-[11px] text-[#718096] sm:block">
                        {e.observacion || ''}
                      </div>
                      {puedeEditar && pendientes && (
                        <button
                          type="button"
                          data-recepcion={e.id}
                          onClick={(ev) => {
                            ev.stopPropagation()
                            setModal({ tipo: 'recepcion', id: e.id })
                          }}
                          className="btn btn-secundario btn-chico shrink-0"
                        >
                          Recepción
                        </button>
                      )}
                      <span className="text-[11px] text-[#718096]">Ver detalle →</span>
                    </div>
                  )
                })}
              </div>
            )}

            {visibles.length > 0 && subvista === 'fichas' && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibles.map((e) => {
                  const pendientes = conRecepcionPendiente(e)
                  return (
                    <div
                      key={e.id}
                      data-entrega-ficha={e.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setModal({ tipo: 'entrega-detalle', id: e.id })}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') setModal({ tipo: 'entrega-detalle', id: e.id })
                      }}
                      className="cursor-pointer rounded-xl border border-[#E4E8EE] bg-white p-4 text-left transition hover:border-[#3478C7]/50 hover:shadow-[0_4px_14px_rgba(24,40,62,0.08)] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-lg font-bold leading-tight text-[#18283E]">
                            Entrega #{e.id}
                          </div>
                          <div className="text-xs text-[#718096]">
                            {fechaHora(e.fechaEntrega)}
                          </div>
                        </div>
                        <Pill texto={`${e.detalles.length} OT`} color="#3478C7" />
                      </div>
                      <div
                        className="my-3 h-1 w-full rounded-full"
                        style={{ backgroundColor: pendientes ? '#D97706' : '#27976B' }}
                        aria-hidden="true"
                      />
                      <div className="space-y-1 text-xs text-[#55657A]">
                        <div className="truncate">
                          <span className="font-medium text-[#718096]">Entregada por: </span>
                          {nombreDe(e.entregadoPor) ?? '—'}
                        </div>
                        {pendientes && (
                          <div className="flex items-center gap-2">
                            <Pill
                              texto={`${nRecepcionPendiente(e)} sin recepción`}
                              color="#D97706"
                            />
                            {puedeEditar && (
                              <button
                                type="button"
                                data-recepcion={e.id}
                                onClick={(ev) => {
                                  ev.stopPropagation()
                                  setModal({ tipo: 'recepcion', id: e.id })
                                }}
                                className="btn btn-secundario btn-chico"
                              >
                                Recepción
                              </button>
                            )}
                          </div>
                        )}
                        {e.observacion && (
                          <div className="truncate pt-1 text-[#718096]">{e.observacion}</div>
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

      {modal?.tipo === 'prog-detalle' && progModal && (
        <ModalDetalleProgramacion
          prog={progModal}
          puedeEditar={puedeEditar}
          onCerrar={() => setModal(null)}
          onAgregar={() => setModal({ tipo: 'agregar', id: modal.id })}
          onReprogramar={() => setModal({ tipo: 'reprogramar', id: modal.id })}
          onEntregar={(ots) =>
            setModal({
              tipo: 'nueva-entrega',
              pre: ots,
              volver: { tipo: 'prog-detalle', id: modal.id },
            })
          }
        />
      )}
      {modal?.tipo === 'nueva-prog' && (
        <ModalNuevaProgramacion
          onCerrar={() => setModal(null)}
          onCreada={(id) => {
            void trasCrearProg(id)
          }}
        />
      )}
      {modal?.tipo === 'agregar' && progModal && (
        <ModalAgregar
          prog={progModal}
          onCerrar={() => setModal({ tipo: 'prog-detalle', id: modal.id })}
          onListo={() => {
            void (async () => {
              await recargar()
              setModal({ tipo: 'prog-detalle', id: modal.id })
            })()
          }}
        />
      )}
      {modal?.tipo === 'reprogramar' && progModal && (
        <ModalReprogramar
          prog={progModal}
          onCerrar={() => setModal({ tipo: 'prog-detalle', id: modal.id })}
          onCreada={(id) => {
            void trasCrearProg(id)
          }}
        />
      )}
      {modal?.tipo === 'nueva-entrega' && (
        <ModalNuevaEntrega
          pre={modal.pre}
          tecnicos={tecnicos}
          onCerrar={() => setModal(modal.volver ?? null)}
          onCreada={(id) => {
            void trasEntregaCreada(id)
          }}
        />
      )}
      {modal?.tipo === 'entrega-detalle' && (
        <ModalDetalleEntrega id={modal.id} onCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === 'recepcion' && (
        <ModalRecepcion
          id={modal.id}
          onCerrar={() => setModal(null)}
          onConfirmado={() => {
            void trasRecepcion()
          }}
        />
      )}
    </main>
  )
}
