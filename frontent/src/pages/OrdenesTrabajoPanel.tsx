import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Files,
  History,
  LayoutGrid,
  List,
  PackageCheck,
  Pencil,
  Plus,
  Search,
} from 'lucide-react'
import { api } from '../api/api'
import Modal from '../components/Modal'
import ImportarOTsModal from '../components/ImportarOTsModal'
import { ESTADOS_OT, coloresDe } from '../components/panel/estadosOT'
import PaginacionPanel from '../components/panel/PaginacionPanel'

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

interface CategoriaOT {
  id: number
  nombre: string
  activo?: boolean
}

interface MaterialCat {
  id: number
  nombre: string
  unidadMedida?: string | null
  activo?: boolean
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
  | { tipo: 'nueva' }
  | { tipo: 'editar'; id: number }
  | { tipo: 'materiales'; id: number }
  | { tipo: 'importar' }
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
  icono: typeof Files
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

function ModalDetalle({
  ot,
  puedeEditar,
  onEditar,
  onMateriales,
  onCerrar,
}: {
  ot: OT
  puedeEditar: boolean
  onEditar: () => void
  onMateriales: () => void
  onCerrar: () => void
}) {
  const [hist, setHist] = useState<MovHistorial[] | null>(null)
  const [histError, setHistError] = useState('')

  const estado = ot.estado?.nombre ?? ''
  const col = coloresDe(estado)

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
      <div data-ot-modal>
        <div
          className="mb-4 flex items-center justify-between rounded-lg px-3 py-2"
          style={{ backgroundColor: col.fondo }}
        >
          <span className="text-sm font-semibold" style={{ color: col.texto }}>
            {ot.tipoOT?.nombre || 'Sin tipo'}
          </span>
          <div className="flex items-center gap-2">
            <BadgeEstado estado={estado} />
            {puedeEditar && (
              <>
                <button
                  type="button"
                  data-ot-materiales
                  onClick={onMateriales}
                  title="Materiales"
                  aria-label="Materiales"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E8EE] bg-white text-[#55657A] transition hover:border-[#3478C7] hover:text-[#3478C7] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40"
                >
                  <PackageCheck size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-ot-editar
                  onClick={onEditar}
                  title="Editar"
                  aria-label="Editar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E8EE] bg-white text-[#55657A] transition hover:border-[#3478C7] hover:text-[#3478C7] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40"
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
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
          <Fila label="Ubicación actual" valor={ot.ubicacion} />
          <Fila label="Registrada por" valor={nombreDe(ot.registradoPor)} />
          <Fila label="Fecha de registro" valor={fechaHora(ot.fechaRegistro)} />
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
      </div>
    </Modal>
  )
}

function ModalNueva({
  tipos,
  categorias,
  onCerrar,
  onCreada,
}: {
  tipos: TipoOT[]
  categorias: CategoriaOT[]
  onCerrar: () => void
  onCreada: (ot: OT) => void
}) {
  const [tipoOTId, setTipoOTId] = useState('')
  const [numeroOT, setNumeroOT] = useState('')
  const [apellidosNombre, setApellidosNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!tipoOTId) {
      setError('Selecciona el tipo de OT')
      return
    }
    if (!numeroOT || Number(numeroOT) < 1) {
      setError('Indica el número de OT')
      return
    }
    if (!apellidosNombre.trim()) {
      setError('Indica los apellidos y nombres')
      return
    }
    if (!categoriaId) {
      setError('Selecciona la categoría')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const res = await api.post('/ordenes-trabajo', {
        tipoOTId: Number(tipoOTId),
        numeroOT: Number(numeroOT),
        apellidosNombre: apellidosNombre.trim(),
        descripcion,
        categoriaId: Number(categoriaId),
      })
      onCreada(res as OT)
    } catch (err) {
      setError((err as Error).message || 'No se pudo registrar la OT')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Registrar nueva OT" ancho={520} onCerrar={onCerrar}>
      <div data-nueva-form className="space-y-3">
        <p className="text-sm text-[#55657A]">
          El número de OT se ingresa manualmente y debe ser único por tipo.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              Tipo de OT
            </span>
            <select
              data-nueva-tipo
              value={tipoOTId}
              onChange={(e) => setTipoOTId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
            >
              <option value="">Seleccione…</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              Número de OT
            </span>
            <input
              data-nueva-numero
              type="number"
              min="1"
              value={numeroOT}
              onChange={(e) => setNumeroOT(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              Apellidos y nombre
            </span>
            <input
              data-nueva-apellidos
              type="text"
              value={apellidosNombre}
              onChange={(e) => setApellidosNombre(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              Categoría
            </span>
            <select
              data-nueva-categoria
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
            >
              <option value="">Seleccione…</option>
              {categorias
                .filter((c) => c.activo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
            Descripción (opcional)
          </span>
          <textarea
            data-nueva-descripcion
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Trabajo a realizar…"
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
            {enviando ? 'Registrando…' : 'Registrar OT'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ModalEditar({
  ot,
  tipos,
  categorias,
  onCerrar,
  onGuardada,
}: {
  ot: OT
  tipos: TipoOT[]
  categorias: CategoriaOT[]
  onCerrar: () => void
  onGuardada: (ot: OT) => void
}) {
  const [tipoOTId, setTipoOTId] = useState(String(ot.tipoOT?.id ?? ''))
  const [numeroOT, setNumeroOT] = useState(ot.numeroOT != null ? String(ot.numeroOT) : '')
  const [apellidosNombre, setApellidosNombre] = useState(ot.apellidosNombre ?? '')
  const [descripcion, setDescripcion] = useState(ot.descripcion ?? '')
  const [categoriaId, setCategoriaId] = useState(String(ot.categoria?.id ?? ''))
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!tipoOTId) {
      setError('Selecciona el tipo de OT')
      return
    }
    if (!numeroOT || Number(numeroOT) < 1) {
      setError('Indica el número de OT')
      return
    }
    if (!apellidosNombre.trim()) {
      setError('Indica los apellidos y nombres')
      return
    }
    if (!categoriaId) {
      setError('Selecciona la categoría')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const res = await api.put(`/ordenes-trabajo/${ot.id}`, {
        tipoOTId: Number(tipoOTId),
        numeroOT: Number(numeroOT),
        apellidosNombre: apellidosNombre.trim(),
        descripcion,
        categoriaId: Number(categoriaId),
      })
      onGuardada(res as OT)
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar la OT')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={`Editar OT #${ot.numeroOT ?? ''}`} ancho={520} onCerrar={onCerrar}>
      <div data-editar-form className="space-y-3">
        <p className="text-sm text-[#55657A]">
          El número de OT debe ser único por tipo. El estado y la ubicación los
          gestionan las entregas.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              Tipo de OT
            </span>
            <select
              data-editar-tipo
              value={tipoOTId}
              onChange={(e) => setTipoOTId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
            >
              <option value="">Seleccione…</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              Número de OT
            </span>
            <input
              data-editar-numero
              type="number"
              min="1"
              value={numeroOT}
              onChange={(e) => setNumeroOT(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              Apellidos y nombre
            </span>
            <input
              data-editar-apellidos
              type="text"
              value={apellidosNombre}
              onChange={(e) => setApellidosNombre(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              Categoría
            </span>
            <select
              data-editar-categoria
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
            >
              <option value="">Seleccione…</option>
              {categorias
                .filter((c) => c.activo || String(c.id) === categoriaId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
            Descripción (opcional)
          </span>
          <textarea
            data-editar-descripcion
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Trabajo a realizar…"
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
          />
        </label>
        {error && (
          <div
            data-editar-error
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" data-editar-cancelar className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            data-editar-enviar
            className="btn"
            disabled={enviando}
            onClick={enviar}
          >
            {enviando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

const CLASE_VISTA =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40'

const CLASE_INPUT =
  'w-full rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25'

function ModalMateriales({
  ot,
  onCerrar,
  onGuardada,
}: {
  ot: OT
  onCerrar: () => void
  onGuardada: (ot: OT) => void
}) {
  const [catalogo, setCatalogo] = useState<MaterialCat[]>([])
  const [filas, setFilas] = useState<{ materialId: string; cantidad: string }[]>(
    (ot.materiales ?? []).map((m) => ({
      materialId: String(m.material?.id ?? ''),
      cantidad: String(m.cantidad ?? ''),
    }))
  )
  const [nuevoId, setNuevoId] = useState('')
  const [nuevaCantidad, setNuevaCantidad] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api
      .get('/materiales')
      .then((lista: MaterialCat[]) => setCatalogo(lista))
      .catch(() => setCatalogo([]))
  }, [])

  const enUso = new Set(filas.map((f) => f.materialId))
  const disponibles = catalogo.filter((m) => m.activo && !enUso.has(String(m.id)))

  function agregar() {
    if (!nuevoId) {
      setError('Selecciona un material')
      return
    }
    const cant = Number(nuevaCantidad)
    if (!nuevaCantidad || Number.isNaN(cant) || cant <= 0) {
      setError('Indica una cantidad mayor que cero')
      return
    }
    setError('')
    setFilas([...filas, { materialId: nuevoId, cantidad: nuevaCantidad }])
    setNuevoId('')
    setNuevaCantidad('')
  }

  function quitar(idx: number) {
    setFilas(filas.filter((_, i) => i !== idx))
  }

  async function guardar() {
    for (const f of filas) {
      const cant = Number(f.cantidad)
      if (!f.materialId || Number.isNaN(cant) || cant <= 0) {
        setError('Revisa las cantidades: deben ser mayores que cero')
        return
      }
    }
    setEnviando(true)
    setError('')
    try {
      const res = await api.put(`/ordenes-trabajo/${ot.id}/materiales`, {
        materiales: filas.map((f) => ({
          materialId: Number(f.materialId),
          cantidad: Number(f.cantidad),
        })),
      })
      onGuardada(res as OT)
    } catch (err) {
      setError((err as Error).message || 'No se pudieron guardar los materiales')
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={`Materiales — OT #${ot.numeroOT ?? ''}`} ancho={560} onCerrar={onCerrar}>
      <div data-mat-modal className="space-y-3">
        <p className="text-sm text-[#55657A]">
          Agrega los materiales y cantidades necesarios para esta OT.
        </p>

        <div className="rounded-lg border border-[#E4E8EE]">
          {filas.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-[#718096]">
              Sin materiales asignados.
            </p>
          )}
          {filas.map((f, idx) => {
            const mat = catalogo.find((m) => String(m.id) === f.materialId)
            return (
              <div
                key={idx}
                data-mat-fila={idx}
                className="flex items-center gap-2 border-b border-[#EEF1F5] px-3 py-2 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-[#18283E]">
                  {mat?.nombre ?? 'Material'}
                  {mat?.unidadMedida ? (
                    <span className="text-[#718096]"> ({mat.unidadMedida})</span>
                  ) : null}
                </span>
                <input
                  data-mat-cantidad={idx}
                  type="number"
                  min="0.01"
                  step="any"
                  value={f.cantidad}
                  onChange={(e) => {
                    const copia = [...filas]
                    copia[idx] = { ...copia[idx], cantidad: e.target.value }
                    setFilas(copia)
                  }}
                  className="w-24 rounded-lg border border-[#E4E8EE] px-2 py-1.5 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
                />
                <button
                  type="button"
                  data-mat-quitar={idx}
                  onClick={() => quitar(idx)}
                  className="rounded-lg border border-[#E4E8EE] bg-white px-2 py-1.5 text-xs font-semibold text-[#718096] transition hover:border-red-300 hover:text-red-600"
                >
                  Quitar
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-end gap-2">
          <label className="block min-w-0 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              Material
            </span>
            <select
              data-mat-select
              value={nuevoId}
              onChange={(e) => setNuevoId(e.target.value)}
              className={`${CLASE_INPUT} mt-1`}
            >
              <option value="">Seleccione…</option>
              {disponibles.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.nombre}
                  {m.unidadMedida ? ` (${m.unidadMedida})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block w-28">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              Cantidad
            </span>
            <input
              data-mat-add-cantidad
              type="number"
              min="0.01"
              step="any"
              value={nuevaCantidad}
              onChange={(e) => setNuevaCantidad(e.target.value)}
              className={`${CLASE_INPUT} mt-1`}
            />
          </label>
          <button
            type="button"
            data-mat-agregar
            onClick={agregar}
            className="mb-0.5 shrink-0 rounded-lg border border-[#3478C7] px-3 py-2 text-sm font-semibold text-[#3478C7] transition hover:bg-[#F0F5FB]"
          >
            Agregar
          </button>
        </div>

        {error && (
          <div
            data-mat-error
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" data-mat-cancelar className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            data-mat-guardar
            className="btn"
            disabled={enviando}
            onClick={guardar}
          >
            {enviando ? 'Guardando…' : 'Guardar materiales'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function OrdenesTrabajoPanel() {
  const usuario = api.getUsuario()
  const puedeCrear = usuario?.rol === 'FACTIBILIZADOR'
  const puedeEditar = ['ADMIN', 'FACTIBILIZADOR'].includes(usuario?.rol ?? '')

  const [ots, setOts] = useState<OT[] | null>(null)
  const [tipos, setTipos] = useState<TipoOT[]>([])
  const [categorias, setCategorias] = useState<CategoriaOT[]>([])
  const [error, setError] = useState('')
  const [vista, setVista] = useState<'lista' | 'fichas'>('lista')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [orden, setOrden] = useState('reciente')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState<ModalState>(null)

  async function recargar() {
    try {
      const lista = await api.get('/ordenes-trabajo')
      setOts(lista as OT[])
    } catch (err) {
      setError((err as Error).message || 'No se pudieron cargar las órdenes de trabajo')
    }
  }

  useEffect(() => {
    recargar()
    api
      .get('/tipos-ot')
      .then((t: TipoOT[]) => setTipos(t))
      .catch(() => setTipos([]))
    api
      .get('/categorias')
      .then((c: CategoriaOT[]) => setCategorias(c))
      .catch(() => setCategorias([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lista = ots ?? []
  const totalProgramadas = lista.filter((o) => o.estado?.nombre === 'PROGRAMADO').length
  const totalEntregadas = lista.filter((o) => o.estado?.nombre === 'ENTREGADO').length

  const filtradas = lista.filter((o) => {
    if (filtroTipo && String(o.tipoOT?.id ?? '') !== filtroTipo) return false
    if (filtroEstado && o.estado?.nombre !== filtroEstado) return false
    if (filtroCategoria && String(o.categoria?.id ?? '') !== filtroCategoria) return false
    if (!busqueda) return true
    const q = busqueda.trim().toLowerCase()
    return (
      String(o.numeroOT ?? '').includes(q) ||
      (o.apellidosNombre ?? '').toLowerCase().includes(q) ||
      (o.descripcion ?? '').toLowerCase().includes(q) ||
      (o.categoria?.nombre ?? '').toLowerCase().includes(q) ||
      (o.tipoOT?.nombre ?? '').toLowerCase().includes(q)
    )
  })
  const visibles = [...filtradas].sort((a, b) => {
    if (orden === 'numero') return (a.numeroOT ?? 0) - (b.numeroOT ?? 0)
    const fa = a.fechaRegistro ?? ''
    const fb = b.fechaRegistro ?? ''
    return orden === 'antigua' ? fa.localeCompare(fb) : fb.localeCompare(fa)
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
  const otModal =
    modal?.tipo === 'detalle' || modal?.tipo === 'editar' || modal?.tipo === 'materiales'
      ? lista.find((o) => o.id === modal.id) ?? null
      : null

  async function trasCrear(res: OT) {
    await recargar()
    setModal({ tipo: 'detalle', id: res.id })
  }

  return (
    <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E4E8EE] bg-white px-5 py-4 shadow-[0_4px_18px_rgba(24,40,62,0.07)]">
          <div className="min-w-[240px]">
            <h1 className="text-2xl font-bold text-[#18283E]">Órdenes de trabajo</h1>
            <p className="mt-0.5 text-sm text-[#718096]">Consulta y seguimiento de OT</p>
          </div>
          <div data-indicadores className="flex flex-wrap items-center gap-y-3 divide-x divide-[#E4E8EE]">
            <Indicador
              id="TOTAL"
              icono={Files}
              valor={lista.length}
              etiqueta="Total OT"
              color="#3478C7"
            />
            <Indicador
              id="PROGRAMADAS"
              icono={CalendarDays}
              valor={totalProgramadas}
              etiqueta="Por entregar"
              color="#718096"
            />
            <Indicador
              id="ENTREGADAS"
              icono={PackageCheck}
              valor={totalEntregadas}
              etiqueta="Entregadas"
              color="#27976B"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {ots === null && !error && (
          <div className="rounded-xl border border-[#E4E8EE] bg-white p-8 text-center text-sm text-[#718096]">
            Cargando órdenes de trabajo…
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
                placeholder="Buscar por Nº, apellidos o categoría…"
                className="w-full rounded-lg border border-[#E4E8EE] py-2 pl-9 pr-3 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
              />
            </div>

            <select
              data-filtro-tipo
              value={filtroTipo}
              onChange={(e) => {
                setFiltroTipo(e.target.value)
                setPage(0)
              }}
              className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
            >
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.nombre}
                </option>
              ))}
            </select>

            <select
              data-filtro-categoria
              value={filtroCategoria}
              onChange={(e) => {
                setFiltroCategoria(e.target.value)
                setPage(0)
              }}
              className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              data-filtro-estado
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value)
                setPage(0)
              }}
              className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_OT.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>

            <select
              data-orden
              value={orden}
              onChange={(e) => {
                setOrden(e.target.value)
                setPage(0)
              }}
              className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
            >
              <option value="reciente">Más reciente</option>
              <option value="antigua">Más antigua</option>
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

            {puedeCrear && (
              <>
                <button
                  type="button"
                  data-nueva-ot
                  className="btn ml-auto"
                  onClick={() => setModal({ tipo: 'nueva' })}
                >
                  <Plus size={15} aria-hidden="true" />
                  Nueva OT
                </button>
                <button
                  type="button"
                  className="btn ml-auto"
                  onClick={() => setModal({ tipo: 'importar' })}
                >
                  Importar Excel
                </button>
              </>
            )}
          </div>
        )}

        {ots !== null && (
          <>
            {vaciaTotal && (
              <div
                data-lista-vacia
                className="rounded-xl border border-dashed border-[#CBD5E0] bg-white p-10 text-center"
              >
                <Files size={40} strokeWidth={1.5} className="mx-auto text-[#A0AEC0]" />
                <p className="mt-3 text-sm font-medium text-[#55657A]">
                  Aún no hay órdenes de trabajo registradas.
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
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto rounded-xl border border-[#E4E8EE] bg-white">
                {enPagina.map((o) => {
                  const estado = o.estado?.nombre ?? ''
                  const col = coloresDe(estado)
                  return (
                    <button
                      key={o.id}
                      type="button"
                      data-ot-fila={o.id}
                      onClick={() => setModal({ tipo: 'detalle', id: o.id })}
                      className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#EEF1F5] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#F0F5FB] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#3478C7]/40"
                    >
                      <div className="w-[130px] shrink-0">
                        <div className="text-base font-bold leading-tight text-[#18283E]">
                          #{o.numeroOT ?? '—'}
                        </div>
                        <div className="text-[11px] text-[#718096]">
                          {o.tipoOT?.nombre || 'Sin tipo'}
                        </div>
                      </div>
                      <BadgeEstado estado={estado} />
                      <div className="min-w-[140px] flex-1 truncate text-xs text-[#55657A]">
                        <span className="font-medium text-[#718096]">Ubicación: </span>
                        {o.ubicacion || '—'}
                      </div>
                      <div className="hidden max-w-[240px] flex-1 truncate text-[11px] text-[#718096] sm:block">
                        {o.apellidosNombre || ''}
                        {o.categoria?.nombre ? ` · ${o.categoria.nombre}` : ''}
                      </div>
                      <div className="text-right text-[11px] leading-relaxed text-[#718096]">
                        {fechaCorta(o.fechaRegistro) || '—'}
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
              <div className="grid max-h-[calc(100vh-300px)] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {enPagina.map((o) => {
                  const estado = o.estado?.nombre ?? ''
                  const col = coloresDe(estado)
                  return (
                    <button
                      key={o.id}
                      type="button"
                      data-ot-ficha={o.id}
                      onClick={() => setModal({ tipo: 'detalle', id: o.id })}
                      className="rounded-xl border border-[#E4E8EE] bg-white p-4 text-left transition hover:border-[#3478C7]/50 hover:shadow-[0_4px_14px_rgba(24,40,62,0.08)] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-lg font-bold leading-tight text-[#18283E]">
                            #{o.numeroOT ?? '—'}
                          </div>
                          <div className="text-xs text-[#718096]">
                            {o.tipoOT?.nombre || 'Sin tipo'}
                          </div>
                        </div>
                        <BadgeEstado estado={estado} />
                      </div>
                      <div
                        className="my-3 h-1 w-full rounded-full"
                        style={{ backgroundColor: col.borde }}
                        aria-hidden="true"
                      />
                      <div className="space-y-1 text-xs text-[#55657A]">
                        <div className="truncate">
                          <span className="font-medium text-[#718096]">Ubicación: </span>
                          {o.ubicacion || '—'}
                        </div>
                        <div className="truncate">
                          <span className="font-medium text-[#718096]">Registro: </span>
                          {fechaCorta(o.fechaRegistro) || '—'}
                        </div>
                        {o.apellidosNombre && (
                          <div className="truncate pt-1 text-[#718096]">
                            {o.apellidosNombre}
                            {o.categoria?.nombre ? ` · ${o.categoria.nombre}` : ''}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {modal?.tipo === 'nueva' && (
        <ModalNueva
          tipos={tipos}
          categorias={categorias}
          onCerrar={() => setModal(null)}
          onCreada={trasCrear}
        />
      )}
      {modal?.tipo === 'detalle' && otModal && (
        <ModalDetalle
          ot={otModal}
          puedeEditar={puedeEditar}
          onEditar={() => setModal({ tipo: 'editar', id: otModal.id })}
          onMateriales={() => setModal({ tipo: 'materiales', id: otModal.id })}
          onCerrar={() => setModal(null)}
        />
      )}
      {modal?.tipo === 'materiales' && otModal && (
        <ModalMateriales
          ot={otModal}
          onCerrar={() => setModal({ tipo: 'detalle', id: modal.id })}
          onGuardada={async () => {
            await recargar()
            setModal({ tipo: 'detalle', id: modal.id })
          }}
        />
      )}
      {modal?.tipo === 'editar' && otModal && (
        <ModalEditar
          ot={otModal}
          tipos={tipos}
          categorias={categorias}
          onCerrar={() => setModal({ tipo: 'detalle', id: modal.id })}
          onGuardada={async () => {
            await recargar()
            setModal({ tipo: 'detalle', id: modal.id })
          }}
        />
      )}
      {modal?.tipo === 'importar' && (
        <ImportarOTsModal onCerrar={() => setModal(null)} />
      )}
    </main>
  )
}
