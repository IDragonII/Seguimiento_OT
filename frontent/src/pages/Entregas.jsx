import { useEffect, useState } from 'react'
import { api } from '../api/api'
import Modal from '../components/Modal'

function badgeEstado(nombre) {
  return <span className={`badge badge-${(nombre || '').toLowerCase()}`}>{nombre}</span>
}

function ahoraLocal() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Entregas({ modo = 'entregas' }) {
  const esPorTecnico = modo === 'por-tecnico'
  const [error, setError] = useState('')
  const [mensajeOk, setMensajeOk] = useState('')

  const [entregas, setEntregas] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [detalleEntrega, setDetalleEntrega] = useState(null)

  const [form, setForm] = useState({
    fecha: ahoraLocal(),
    observacion: '',
    tecnicoId: '',
    filas: [],
  })
  const [formAbierto, setFormAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const [órdenesDisponibles, setÓrdenesDisponibles] = useState([])
  const [tecnicosForm, setTecnicosForm] = useState([])

  const [recepcionModalAbierto, setRecepcionModalAbierto] = useState(false)
  const [entregaParaRecibir, setEntregaParaRecibir] = useState(null)
  const [recepcionSeleccion, setRecepcionSeleccion] = useState([])
  const [recepcionObservacion, setRecepcionObservacion] = useState('')
  const [recepcionUbicaciones, setRecepcionUbicaciones] = useState({})
  const [tecnicoDetalle, setTecnicoDetalle] = useState(null)

  function cargar() {
    if (esPorTecnico) {
      api.get('/entregas/tecnicos').then(setTecnicos).catch((err) => setError(err.message))
    } else {
      api.get('/entregas').then(setEntregas).catch((err) => setError(err.message))
    }
  }

  useEffect(() => {
    cargar()
    if (!esPorTecnico) {
      api.get('/ordenes-trabajo/disponibles').then(data => setÓrdenesDisponibles(data)).catch(() => setÓrdenesDisponibles([]))
      api.get('/usuarios/tecnicos').then(setTecnicosForm).catch(() => setTecnicosForm([]))
    }
  }, [esPorTecnico])

  function abrir() {
    setForm({ fecha: ahoraLocal(), observacion: '', tecnicoId: '', filas: [] })
    setBusqueda('')
    setError('')
    setFormAbierto(true)
  }

  function cerrar() {
    setFormAbierto(false)
  }

  function toggleOT(id) {
    const idx = form.filas.findIndex((f) => f.ordenId === id)
    if (idx >= 0) {
      setForm((prev) => ({
        ...prev,
        filas: prev.filas.filter((f) => f.ordenId !== id),
      }))
    } else {
      setForm((prev) => ({
        ...prev,
        filas: [...prev.filas, { ordenId: id, tecnicoId: '' }],
      }))
    }
  }

  function setTecnicoFila(id, tecnicoId) {
    setForm((prev) => ({
      ...prev,
      filas: prev.filas.map((f) =>
        f.ordenId === id ? { ...f, tecnicoId } : f,
      ),
    }))
  }

  async function crearEntrega(e) {
    e.preventDefault()
    setError('')
    setMensajeOk('')
    if (form.filas.length === 0) {
      setError('Seleccione al menos una OT para entregar')
      return
    }
    const sinTecnico = form.filas.filter((f) => !(f.tecnicoId || form.tecnicoId))
    if (sinTecnico.length > 0) {
      setError('Asigna un técnico general o uno individual para cada OT')
      return
    }
    try {
      await api.post('/entregas', {
        observacion: form.observacion,
        fecha: form.fecha,
        detalles: form.filas.map((f) => ({
          ordenId: f.ordenId,
          tecnicoId: Number(f.tecnicoId || form.tecnicoId),
        })),
      })
      setMensajeOk('Entrega registrada correctamente')
      cerrar()
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function verDetalle(entregaId) {
    try {
      const data = await api.get(`/entregas/${entregaId}`)
      setDetalleEntrega(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function abrirRecepcionModal(entregaId) {
    setError('')
    setMensajeOk('')
    try {
      const data = await api.get(`/entregas/${entregaId}`)
      setEntregaParaRecibir(data)
      setRecepcionSeleccion([])
      setRecepcionObservacion('')
      setRecepcionUbicaciones({})
      setRecepcionModalAbierto(true)
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleRecepcionSeleccion(detalleId) {
    const estaba = recepcionSeleccion.includes(detalleId)
    setRecepcionSeleccion((prev) =>
      estaba ? prev.filter((id) => id !== detalleId) : [...prev, detalleId],
    )
    if (estaba) {
      setRecepcionUbicaciones((prev) => {
        const copia = { ...prev }
        delete copia[detalleId]
        return copia
      })
    }
  }

  async function confirmarRecepcionMasiva(e) {
    e.preventDefault()
    setError('')
    setMensajeOk('')
    if (recepcionSeleccion.length === 0) {
      setError('Seleccione al menos una OT para recibir')
      return
    }
    const sinUbicacion = recepcionSeleccion.filter(
      (id) => !(recepcionUbicaciones[id] || '').trim(),
    )
    if (sinUbicacion.length > 0) {
      const numeros = entregaParaRecibir.detalles
        .filter((d) => sinUbicacion.includes(d.id))
        .map((d) => `#${d.ordenTrabajo?.numeroOT}`)
        .join(', ')
      setError(`Debe indicar la ubicación de: ${numeros}`)
      return
    }
    try {
      await api.post(`/entregas/${entregaParaRecibir.entrega.id}/recepcion`, {
        detalleIds: recepcionSeleccion,
        observacion: recepcionObservacion || 'Recepción confirmada',
        ubicaciones: Object.fromEntries(
          recepcionSeleccion.map((id) => [id, (recepcionUbicaciones[id] || '').trim()]),
        ),
      })
      setMensajeOk('Recepción confirmada correctamente')
      cerrarRecepcionModal()
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  function cerrarRecepcionModal() {
    setRecepcionModalAbierto(false)
    setEntregaParaRecibir(null)
    setRecepcionSeleccion([])
    setRecepcionObservacion('')
    setRecepcionUbicaciones({})
  }

  const OTsFiltradas = órdenesDisponibles.filter((o) => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      String(o.numeroOT).includes(busqueda) ||
      o.tipoOT?.nombre.toLowerCase().includes(q) ||
      o.descripcion?.toLowerCase().includes(q)
    )
  })

  const OTsDisponibles = OTsFiltradas.filter(
    (o) => !form.filas.some((f) => f.ordenId === o.id)
  )
  const filasResueltas = form.filas.filter((f) => f.tecnicoId || form.tecnicoId)

  if (esPorTecnico) {
    return (
      <>
        <h1 className="page-title">OT por técnico</h1>
        <p className="page-subtitle">Entregas agrupadas por técnico</p>
        {error && <div className="alerta-error">{error}</div>}
        {mensajeOk && <div className="alerta-ok">{mensajeOk}</div>}
        <div className="card">
          <h2>Técnicos y OT entregadas</h2>
          {tecnicos.length === 0 ? (
            <div className="vacio">No hay técnicos con OT entregadas</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th>Total OT entregadas</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {tecnicos.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Técnico">{t.nombre}</td>
                    <td data-label="Total OT entregadas">{t.total}</td>
                    <td data-label="">
                      <button
                        className="btn btn-secundario btn-chico"
                        type="button"
                        onClick={() => setTecnicoDetalle(t)}
                      >
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {tecnicoDetalle && (
          <Modal
            titulo={`Detalles — ${tecnicoDetalle.nombre}`}
            onCerrar={() => setTecnicoDetalle(null)}
            ancho={820}
          >
            {tecnicoDetalle.ots.length === 0 ? (
              <div className="vacio">Sin OT entregadas</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>OT</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Entrega</th>
                    <th>Estado</th>
                    <th>Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {tecnicoDetalle.ots.map((o) => (
                    <tr key={o.id}>
                      <td data-label="OT">#{o.numeroOT}</td>
                      <td data-label="Tipo">{o.tipoOT}</td>
                      <td data-label="Descripción">{o.descripcion || '—'}</td>
                      <td data-label="Entrega">
                        {o.fechaEntrega ? new Date(o.fechaEntrega).toLocaleString() : '—'}
                      </td>
                      <td data-label="Estado">{badgeEstado(o.estado)}</td>
                      <td data-label="Ubicación">{o.ubicacion || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Modal>
        )}
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">Entregas</h1>
      <p className="page-subtitle">Entrega de OT a técnicos y recepción de devoluciones</p>
      {error && <div className="alerta-error">{error}</div>}
      {mensajeOk && <div className="alerta-ok">{mensajeOk}</div>}

      {formAbierto && (
        <Modal titulo="Registrar entrega" onCerrar={() => setFormAbierto(false)} ancho={900}>
          <form className="formulario" onSubmit={crearEntrega}>
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <label>FECHA</label>
                  <input
                    type="datetime-local"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  />
                  <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 6 }}>
                    Por defecto la fecha y hora actual
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <label>TÉCNICO GENERAL</label>
                  <select
                    value={form.tecnicoId}
                    onChange={(e) => setForm({ ...form, tecnicoId: e.target.value })}
                  >
                    <option value="">(sin técnico general)</option>
                    {tecnicosForm.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombres} {t.apellidos}
                      </option>
                    ))}
                  </select>
                  <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 6 }}>
                    Se aplica a todas las OTs seleccionadas
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <label>OBSERVACIÓN</label>
                  <textarea
                    rows={4}
                    value={form.observacion}
                    onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                    placeholder="Ej: Ruta norte"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <label>OTS A ENTREGAR (ESTADO PROGRAMADO)</label>
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por número OT, tipo o descripción…"
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ maxHeight: 190, overflowY: 'auto' }}>
                    {órdenesDisponibles.length === 0 && (
                      <div style={{ color: 'var(--muted)', fontSize: 13, padding: '6px 2px' }}>
                        No hay OT en estado PROGRAMADO disponibles
                      </div>
                    )}
                    {órdenesDisponibles.length > 0 && OTsDisponibles.length === 0 && (
                      <div style={{ color: 'var(--muted)', fontSize: 13, padding: '6px 2px' }}>
                        {busqueda
                          ? `Sin resultados para "${busqueda}"`
                          : 'Todas las OT disponibles ya están seleccionadas'}
                      </div>
                    )}
                    {OTsDisponibles.map((o) => (
                      <div
                        key={o.id}
                        onClick={() => toggleOT(o.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 13,
                          padding: '7px 6px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong>#{o.numeroOT}</strong> — {o.tipoOT?.nombre}
                          {o.descripcion && (
                            <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 6 }}>{` — ${o.descripcion}`}</span>
                          )}
                        </div>
                        <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          + Agregar
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <label>OTs SELECCIONADAS ({form.filas.length})</label>
                  <div style={{ maxHeight: 190, overflowY: 'auto' }}>
                    {form.filas.length === 0 && (
                      <div style={{ color: 'var(--muted)', fontSize: 13, padding: '6px 2px' }}>
                        Ninguna OT seleccionada aún — haz clic en "+ Agregar"
                      </div>
                    )}
                    {form.filas.map((f) => {
                      const o = órdenesDisponibles.find((x) => x.id === f.ordenId)
                      const general = tecnicosForm.find((t) => String(t.id) === String(form.tecnicoId))
                      return (
                        <div
                          key={f.ordenId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13,
                            padding: '7px 6px',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong>#{o?.numeroOT}</strong> — {o?.tipoOT?.nombre}
                            {o?.descripcion && (
                              <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 6 }}>{` — ${o.descripcion}`}</span>
                            )}
                          </div>
                          <select
                            value={f.tecnicoId}
                            onChange={(e) => setTecnicoFila(f.ordenId, e.target.value)}
                            style={{ width: 180, padding: '5px 6px', fontSize: 12.5 }}
                            title="Técnico individual (opcional)"
                          >
                            <option value="">
                              {general
                                ? `General: ${general.nombres} ${general.apellidos}`
                                : '(elegir técnico)'}
                            </option>
                            {tecnicosForm.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.nombres} {t.apellidos}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-secundario btn-chico"
                            onClick={() => toggleOT(f.ordenId)}
                            title="Quitar de la selección"
                            style={{ padding: '2px 9px' }}
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

            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              {form.filas.length} OT seleccionada(s) · {filasResueltas.length} con técnico asignado
              {!form.tecnicoId && form.filas.length > 0 && filasResueltas.length !== form.filas.length && (
                <span style={{ color: 'var(--danger)' }}> · faltan técnicos</span>
              )}
            </div>

            <div className="acciones">
              <button
                className="btn"
                type="submit"
                disabled={
                  form.filas.length === 0 ||
                  filasResueltas.length !== form.filas.length
                }
              >
                Registrar entrega
              </button>
              <button className="btn btn-secundario" type="button" onClick={() => cerrar()}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="card">
        <div className="toolbar">
          <button className="btn" type="button" onClick={() => abrir()}>Nueva entrega</button>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            {entregas.length} entrega(s)
          </span>
        </div>
        {entregas.length === 0 ? (
          <div className="vacio">No hay entregas</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Entregada por</th>
                <th>Observación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entregas.map((entrega) => {
                const detalles = entrega.detalles || []
                const tienePendientesRecepcion = detalles.some(
                  (d) => d.ordenTrabajo?.estado?.nombre === 'ENTREGADO'
                )
                return (
                  <tr key={entrega.id}>
                    <td data-label="#">{entrega.id}</td>
                    <td data-label="Fecha">
                      {new Date(entrega.fechaEntrega).toLocaleString()}
                    </td>
                    <td data-label="Entregada por">
                      {entrega.entregadoPor?.nombres} {entrega.entregadoPor?.apellidos}
                    </td>
                    <td data-label="Observación">{entrega.observacion || '—'}</td>
                    <td data-label="">
                      {tienePendientesRecepcion && (
                        <button
                          className="btn btn-secundario btn-chico"
                          onClick={() => abrirRecepcionModal(entrega.id)}
                        >
                          Recepción
                        </button>
                      )}
                      <button className="btn btn-secundario btn-chico" onClick={() => verDetalle(entrega.id)}>
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {detalleEntrega && (
        <Modal
          titulo={`Detalle — entrega #${detalleEntrega.entrega.id}`}
          onCerrar={() => setDetalleEntrega(null)}
        >
          {detalleEntrega.detalles.length === 0 ? (
            <div className="vacio">Sin detalles</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>OT</th>
                  <th>Técnico</th>
                  <th>Estado</th>
                  <th>Ubicación</th>
                  <th>Devolución</th>
                  <th>Recepción</th>
                </tr>
              </thead>
              <tbody>
                {detalleEntrega.detalles.map((d) => (
                  <tr key={d.id}>
                    <td data-label="OT">#{d.ordenTrabajo?.numeroOT}</td>
                    <td data-label="Técnico">
                      {d.tecnico?.nombres} {d.tecnico?.apellidos}
                    </td>
                    <td data-label="Estado">
                      {badgeEstado(d.ordenTrabajo?.estado?.nombre)}
                    </td>
                    <td data-label="Ubicación">{d.ordenTrabajo?.ubicacion || '—'}</td>
                    <td data-label="Devolución">
                      {d.fechaDevolucion ? new Date(d.fechaDevolucion).toLocaleString() : '—'}
                    </td>
                    <td data-label="Recepción">
                      {d.recibidoPor
                        ? `${d.recibidoPor.nombres} ${d.recibidoPor.apellidos}`
                        : 'Pendiente'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}

      {recepcionModalAbierto && entregaParaRecibir && (
        <Modal
          titulo={`Confirmar recepción — entrega #${entregaParaRecibir.entrega.id}`}
          onCerrar={cerrarRecepcionModal}
          ancho={700}
        >
          <form className="formulario" onSubmit={confirmarRecepcionMasiva}>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
              Seleccione las OT que se le entregaron e indique la ubicación de cada una.
              Las demás permanecerán sin cambios.
            </p>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
              {entregaParaRecibir.detalles.length === 0 && (
                <div style={{ color: 'var(--muted)', fontSize: 13, padding: 8 }}>
                  No hay OT en esta entrega
                </div>
              )}
              {entregaParaRecibir.detalles.map((d) => {
                const recibible = d.ordenTrabajo?.estado?.nombre === 'ENTREGADO' && !d.recibidoPor
                const yaSeleccionada = recepcionSeleccion.includes(d.id)
                return (
                  <div
                    key={d.id}
                    style={{
                      fontSize: 13,
                      marginBottom: 8,
                      borderBottom: '1px solid #eee',
                      paddingBottom: 6,
                      opacity: recibible ? 1 : 0.5,
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontWeight: 400,
                        cursor: recibible ? 'pointer' : 'default',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={yaSeleccionada}
                        disabled={!recibible}
                        onChange={() => toggleRecepcionSeleccion(d.id)}
                        style={{ width: 'auto' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>#{d.ordenTrabajo?.numeroOT}</strong> — {d.ordenTrabajo?.tipoOT?.nombre}
                        {d.ordenTrabajo?.descripcion && (
                          <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 6 }}>{` — ${d.ordenTrabajo.descripcion}`}</span>
                        )}
                      </div>
                      {!recibible && (
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                          {d.recibidoPor ? 'ya recibida' : `estado ${d.ordenTrabajo?.estado?.nombre || '—'}`}
                        </span>
                      )}
                    </label>
                    {yaSeleccionada && (
                      <div style={{ paddingLeft: 34, marginTop: 6 }}>
                        <label style={{ fontSize: 11.5, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
                          Ubicación de la OT
                        </label>
                        <input
                          value={recepcionUbicaciones[d.id] || ''}
                          onChange={(e) =>
                            setRecepcionUbicaciones((prev) => ({ ...prev, [d.id]: e.target.value }))
                          }
                          placeholder="Ej: Bodega central"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 10 }}>
              <label>Observación (opcional)</label>
              <input
                value={recepcionObservacion}
                onChange={(e) => setRecepcionObservacion(e.target.value)}
                placeholder="Ej: Recepción en almacén"
              />
            </div>

            <div className="acciones">
              <button className="btn" type="submit" disabled={recepcionSeleccion.length === 0}>
                Confirmar recepción ({recepcionSeleccion.length})
              </button>
              <button className="btn btn-secundario" type="button" onClick={cerrarRecepcionModal}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}