import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Files,
  History,
  LayoutGrid,
  List,
  PackageCheck,
  Plus,
  Search,
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

interface TipoOT {
  id: number
  nombre: string
}

interface OT {
  id: number
  numeroOT?: number
  tipoOT?: { id?: number; nombre?: string }
  estado?: { nombre?: string }
  descripcion?: string
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
  ENTREGA: 'Entrega al técnico',
  SOLICITUD_DEVOLUCION: 'Solicitud de devolución',
  CONFIRMACION_RECEPCION: 'Confirmación de recepción',
  ALERTA_VENCIMIENTO: 'Alerta de vencimiento',
}

type ModalState = { tipo: 'detalle'; id: number } | { tipo: 'nueva' } | null

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

function ModalDetalle({ ot, onCerrar }: { ot: OT; onCerrar: () => void }) {
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
          <BadgeEstado estado={estado} />
        </div>

        {ot.descripcion && (
          <p className="mb-4 text-sm leading-relaxed text-[#55657A]">{ot.descripcion}</p>
        )}

        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[#18283E]">
          Datos de la OT
        </h3>
        <dl className="mb-4">
          <Fila label="Número" valor={ot.numeroOT != null ? `#${ot.numeroOT}` : undefined} />
          <Fila label="Tipo" valor={ot.tipoOT?.nombre} />
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
  onCerrar,
  onCreada,
}: {
  tipos: TipoOT[]
  onCerrar: () => void
  onCreada: (ot: OT) => void
}) {
  const [tipoOTId, setTipoOTId] = useState('')
  const [numeroOT, setNumeroOT] = useState('')
  const [descripcion, setDescripcion] = useState('')
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
    setEnviando(true)
    setError('')
    try {
      const res = await api.post('/ordenes-trabajo', {
        tipoOTId: Number(tipoOTId),
        numeroOT: Number(numeroOT),
        descripcion,
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

const CLASE_VISTA =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40'

export default function OrdenesTrabajoPanel() {
  const usuario = api.getUsuario()
  const puedeCrear = usuario?.rol === 'FACTIBILIZADOR'

  const [ots, setOts] = useState<OT[] | null>(null)
  const [tipos, setTipos] = useState<TipoOT[]>([])
  const [error, setError] = useState('')
  const [vista, setVista] = useState<'lista' | 'fichas'>('lista')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [orden, setOrden] = useState('reciente')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lista = ots ?? []
  const totalProgramadas = lista.filter((o) => o.estado?.nombre === 'PROGRAMADO').length
  const totalEntregadas = lista.filter((o) => o.estado?.nombre === 'ENTREGADO').length

  const filtradas = lista.filter((o) => {
    if (filtroTipo && String(o.tipoOT?.id ?? '') !== filtroTipo) return false
    if (filtroEstado && o.estado?.nombre !== filtroEstado) return false
    if (!busqueda) return true
    const q = busqueda.trim().toLowerCase()
    return (
      String(o.numeroOT ?? '').includes(q) ||
      (o.descripcion ?? '').toLowerCase().includes(q) ||
      (o.tipoOT?.nombre ?? '').toLowerCase().includes(q)
    )
  })
  const visibles = [...filtradas].sort((a, b) => {
    if (orden === 'numero') return (a.numeroOT ?? 0) - (b.numeroOT ?? 0)
    const fa = a.fechaRegistro ?? ''
    const fb = b.fechaRegistro ?? ''
    return orden === 'antigua' ? fa.localeCompare(fb) : fb.localeCompare(fa)
  })

  const vaciaTotal = lista.length === 0
  const vaciaFiltrada = !vaciaTotal && visibles.length === 0
  const otModal =
    modal?.tipo === 'detalle' ? lista.find((o) => o.id === modal.id) ?? null : null

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
              etiqueta="Programadas"
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
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por Nº, tipo o descripción…"
                className="w-full rounded-lg border border-[#E4E8EE] py-2 pl-9 pr-3 text-sm text-[#18283E] outline-none focus:border-[#3478C7] focus:ring-2 focus:ring-[#3478C7]/25"
              />
            </div>

            <select
              data-filtro-tipo
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
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
              data-filtro-estado
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
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
              onChange={(e) => setOrden(e.target.value)}
              className="rounded-lg border border-[#E4E8EE] bg-white px-2.5 py-2 text-sm text-[#18283E] outline-none focus:border-[#3478C7]"
            >
              <option value="reciente">Más reciente</option>
              <option value="antigua">Más antigua</option>
              <option value="numero">Nº de OT</option>
            </select>

            <span data-resultados className="text-xs font-medium text-[#718096]">
              {visibles.length} resultado{visibles.length === 1 ? '' : 's'}
            </span>

            {puedeCrear && (
              <button
                type="button"
                data-nueva-ot
                className="btn ml-auto"
                onClick={() => setModal({ tipo: 'nueva' })}
              >
                <Plus size={15} aria-hidden="true" />
                Nueva OT
              </button>
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
              <div className="overflow-hidden rounded-xl border border-[#E4E8EE] bg-white">
                {visibles.map((o) => {
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
                        {o.descripcion || ''}
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibles.map((o) => {
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
                        {o.descripcion && (
                          <div className="truncate pt-1 text-[#718096]">{o.descripcion}</div>
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
          onCerrar={() => setModal(null)}
          onCreada={trasCrear}
        />
      )}
      {modal?.tipo === 'detalle' && otModal && (
        <ModalDetalle ot={otModal} onCerrar={() => setModal(null)} />
      )}
    </main>
  )
}
