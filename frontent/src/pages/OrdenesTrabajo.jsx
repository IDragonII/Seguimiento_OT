import { useEffect, useState } from 'react'
import { api } from '../api/api'
import Modal from '../components/Modal'

export default function OrdenesTrabajo() {
  const usuario = api.getUsuario()
  const puedeCrear = ['ADMIN', 'FACTIBILIZADOR'].includes(usuario.rol)
  const puedeEditar = puedeCrear

  const [ordenes, setOrdenes] = useState([])
  const [tipos, setTipos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [catalogoMateriales, setCatalogoMateriales] = useState([])
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [historial, setHistorial] = useState(null)

  const [materialesEdit, setMaterialesEdit] = useState(null)
  const [matFilas, setMatFilas] = useState([])
  const [matNuevoId, setMatNuevoId] = useState('')
  const [matNuevaCantidad, setMatNuevaCantidad] = useState('')
  const [matError, setMatError] = useState('')
  const [matEnviando, setMatEnviando] = useState(false)

  const [form, setForm] = useState({
    tipoOTId: '',
    numeroOT: '',
    apellidosNombre: '',
    descripcion: '',
    categoriaId: '',
  })
  const [formAbierto, setFormAbierto] = useState(false)
  const [mensajeOk, setMensajeOk] = useState('')

  const [editando, setEditando] = useState(null)
  const [formEdit, setFormEdit] = useState({
    tipoOTId: '',
    numeroOT: '',
    apellidosNombre: '',
    descripcion: '',
    categoriaId: '',
  })

  function cargar() {
    api
      .get('/ordenes-trabajo')
      .then(setOrdenes)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    cargar()
    api.get('/categorias').then(setCategorias).catch(() => setCategorias([]))
    api.get('/materiales').then(setCatalogoMateriales).catch(() => setCatalogoMateriales([]))
    if (puedeCrear) {
      api.get('/tipos-ot').then(setTipos).catch(() => setTipos([]))
    }
  }, [puedeCrear])

  async function crear(e) {
    e.preventDefault()
    setError('')
    setMensajeOk('')
    try {
      await api.post('/ordenes-trabajo', {
        tipoOTId: Number(form.tipoOTId),
        numeroOT: Number(form.numeroOT),
        apellidosNombre: form.apellidosNombre,
        descripcion: form.descripcion,
        categoriaId: Number(form.categoriaId),
      })
      setMensajeOk('OT registrada correctamente')
      setForm({
        tipoOTId: '',
        numeroOT: '',
        apellidosNombre: '',
        descripcion: '',
        categoriaId: '',
      })
      setFormAbierto(false)
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function verHistorial(orden) {
    try {
      const hist = await api.get(`/ordenes-trabajo/${orden.id}/historial`)
      setHistorial({ orden, hist })
    } catch (err) {
      setError(err.message)
    }
  }

  function abrirMateriales(orden) {
    setMaterialesEdit(orden)
    setMatFilas(
      (orden.materiales ?? []).map((m) => ({
        materialId: String(m.material?.id ?? ''),
        cantidad: String(m.cantidad ?? ''),
      }))
    )
    setMatNuevoId('')
    setMatNuevaCantidad('')
    setMatError('')
  }

  function agregarMaterial() {
    if (!matNuevoId) {
      setMatError('Selecciona un material')
      return
    }
    const cant = Number(matNuevaCantidad)
    if (!matNuevaCantidad || Number.isNaN(cant) || cant <= 0) {
      setMatError('Indica una cantidad mayor que cero')
      return
    }
    setMatError('')
    setMatFilas([...matFilas, { materialId: matNuevoId, cantidad: matNuevaCantidad }])
    setMatNuevoId('')
    setMatNuevaCantidad('')
  }

  async function guardarMateriales(e) {
    e.preventDefault()
    setMatError('')
    for (const f of matFilas) {
      const cant = Number(f.cantidad)
      if (!f.materialId || Number.isNaN(cant) || cant <= 0) {
        setMatError('Revisa las cantidades: deben ser mayores que cero')
        return
      }
    }
    setMatEnviando(true)
    try {
      await api.put(`/ordenes-trabajo/${materialesEdit.id}/materiales`, {
        materiales: matFilas.map((f) => ({
          materialId: Number(f.materialId),
          cantidad: Number(f.cantidad),
        })),
      })
      setMensajeOk(`Materiales de la OT #${materialesEdit.numeroOT} actualizados`)
      setMaterialesEdit(null)
      cargar()
    } catch (err) {
      setMatError(err.message)
    } finally {
      setMatEnviando(false)
    }
  }

  function abrirEdicion(orden) {
    setFormEdit({
      tipoOTId: String(orden.tipoOT?.id ?? ''),
      numeroOT: String(orden.numeroOT ?? ''),
      apellidosNombre: orden.apellidosNombre ?? '',
      descripcion: orden.descripcion ?? '',
      categoriaId: String(orden.categoria?.id ?? ''),
    })
    setEditando(orden)
  }

  async function guardarEdicion(e) {
    e.preventDefault()
    setError('')
    setMensajeOk('')
    try {
      await api.put(`/ordenes-trabajo/${editando.id}`, {
        tipoOTId: Number(formEdit.tipoOTId),
        numeroOT: Number(formEdit.numeroOT),
        apellidosNombre: formEdit.apellidosNombre,
        descripcion: formEdit.descripcion,
        categoriaId: Number(formEdit.categoriaId),
      })
      setMensajeOk(`OT #${editando.numeroOT} actualizada`)
      setEditando(null)
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const filtradas = ordenes.filter((o) => {
    const coincideBusqueda =
      !busqueda ||
      String(o.numeroOT).includes(busqueda) ||
      o.apellidosNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      o.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      o.categoria?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      o.tipoOT?.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado = !filtroEstado || o.estado?.nombre === filtroEstado
    const coincideCategoria = !filtroCategoria || String(o.categoria?.id ?? '') === filtroCategoria
    return coincideBusqueda && coincideEstado && coincideCategoria
  })

  return (
    <>
      <h1 className="page-title">Órdenes de trabajo</h1>
      <p className="page-subtitle">Registro y seguimiento de OT</p>

      {error && <div className="alerta-error">{error}</div>}
      {mensajeOk && <div className="alerta-ok">{mensajeOk}</div>}

      <div className="card">
        <div className="toolbar">
          <div className="acciones">
            {puedeCrear && (
              <button className="btn" type="button" onClick={() => setFormAbierto(true)}>
                Nueva OT
              </button>
            )}
            <input
              placeholder="Buscar por número, apellidos, categoría…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="PROGRAMADO">PROGRAMADO</option>
              <option value="ENTREGADO">ENTREGADO</option>
              <option value="DEVUELTO">DEVUELTO</option>
              <option value="CERRADO">CERRADO</option>
            </select>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              data-filtro-categoria
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            {filtradas.length} resultado(s)
          </span>
        </div>

        {filtradas.length === 0 ? (
          <div className="vacio">No hay órdenes de trabajo</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Tipo</th>
                <th>Apellidos y nombre</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Ubicación</th>
                <th>Registro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((o) => (
                <tr key={o.id}>
                  <td data-label="#">#{o.numeroOT}</td>
                  <td data-label="Tipo">{o.tipoOT?.nombre}</td>
                  <td data-label="Apellidos y nombre">{o.apellidosNombre || '—'}</td>
                  <td data-label="Categoría">{o.categoria?.nombre || '—'}</td>
                  <td data-label="Estado">
                    <span className={`badge badge-${o.estado?.nombre.toLowerCase()}`}>
                      {o.estado?.nombre}
                    </span>
                  </td>
                  <td data-label="Ubicación">{o.ubicacion || '—'}</td>
                  <td data-label="Registro">{new Date(o.fechaRegistro).toLocaleDateString()}</td>
                  <td data-label="">
                    {puedeEditar && (
                      <>
                        <button
                          className="btn btn-secundario btn-chico"
                          style={{ marginRight: 6 }}
                          onClick={() => abrirMateriales(o)}
                        >
                          Materiales
                        </button>
                        <button
                          className="btn btn-secundario btn-chico"
                          style={{ marginRight: 6 }}
                          onClick={() => abrirEdicion(o)}
                        >
                          Editar
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-secundario btn-chico"
                      onClick={() => verHistorial(o)}
                    >
                      Historial
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formAbierto && (
        <Modal
          titulo="Registrar nueva OT"
          onCerrar={() => setFormAbierto(false)}
          ancho={560}
        >
          <form className="formulario" onSubmit={crear}>
            <div className="fila">
              <div>
                <label>Tipo de OT</label>
                <select
                  value={form.tipoOTId}
                  onChange={(e) => setForm({ ...form, tipoOTId: e.target.value })}
                  required
                >
                  <option value="">Seleccione…</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Número de OT</label>
                <input
                  type="number"
                  min="1"
                  value={form.numeroOT}
                  onChange={(e) => setForm({ ...form, numeroOT: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="fila">
              <div>
                <label>Apellidos y nombre</label>
                <input
                  type="text"
                  value={form.apellidosNombre}
                  onChange={(e) => setForm({ ...form, apellidosNombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Categoría</label>
                <select
                  value={form.categoriaId}
                  onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                  required
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
              </div>
            </div>
            <div>
              <label>Descripción</label>
              <textarea
                rows="3"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>
            <div className="acciones">
              <button className="btn" type="submit">
                Registrar OT
              </button>
              <button
                className="btn btn-secundario"
                type="button"
                onClick={() => setFormAbierto(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editando && (
        <Modal
          titulo={`Editar OT #${editando.numeroOT} (${editando.tipoOT?.nombre})`}
          onCerrar={() => setEditando(null)}
          ancho={560}
        >
          <form className="formulario" onSubmit={guardarEdicion}>
            <div className="fila">
              <div>
                <label>Tipo de OT</label>
                <select
                  value={formEdit.tipoOTId}
                  onChange={(e) => setFormEdit({ ...formEdit, tipoOTId: e.target.value })}
                  required
                >
                  <option value="">Seleccione…</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Número de OT</label>
                <input
                  type="number"
                  min="1"
                  value={formEdit.numeroOT}
                  onChange={(e) => setFormEdit({ ...formEdit, numeroOT: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="fila">
              <div>
                <label>Apellidos y nombre</label>
                <input
                  type="text"
                  value={formEdit.apellidosNombre}
                  onChange={(e) => setFormEdit({ ...formEdit, apellidosNombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Categoría</label>
                <select
                  value={formEdit.categoriaId}
                  onChange={(e) => setFormEdit({ ...formEdit, categoriaId: e.target.value })}
                  required
                >
                  <option value="">Seleccione…</option>
                  {categorias
                    .filter((c) => c.activo || String(c.id) === formEdit.categoriaId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div>
              <label>Descripción</label>
              <textarea
                rows="3"
                value={formEdit.descripcion}
                onChange={(e) => setFormEdit({ ...formEdit, descripcion: e.target.value })}
              />
            </div>
            <div className="acciones">
              <button className="btn" type="submit">
                Guardar cambios
              </button>
              <button
                className="btn btn-secundario"
                type="button"
                onClick={() => setEditando(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {materialesEdit && (
        <Modal
          titulo={`Materiales — OT #${materialesEdit.numeroOT}`}
          onCerrar={() => setMaterialesEdit(null)}
          ancho={560}
        >
          <form className="formulario" onSubmit={guardarMateriales}>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>
              Agrega los materiales y cantidades necesarios para esta OT.
            </p>

            <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
              {matFilas.length === 0 && (
                <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 14px' }}>
                  Sin materiales asignados.
                </div>
              )}
              {matFilas.map((f, idx) => {
                const mat = catalogoMateriales.find((m) => String(m.id) === f.materialId)
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      padding: '7px 10px',
                      borderBottom: idx < matFilas.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {mat?.nombre ?? 'Material'}
                      {mat?.unidadMedida ? ` (${mat.unidadMedida})` : ''}
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={f.cantidad}
                      onChange={(e) => {
                        const copia = [...matFilas]
                        copia[idx] = { ...copia[idx], cantidad: e.target.value }
                        setMatFilas(copia)
                      }}
                      style={{ width: 90, padding: '4px 6px' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secundario btn-chico"
                      onClick={() => setMatFilas(matFilas.filter((_, i) => i !== idx))}
                    >
                      Quitar
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="fila">
              <div>
                <label>Material</label>
                <select
                  value={matNuevoId}
                  onChange={(e) => setMatNuevoId(e.target.value)}
                >
                  <option value="">Seleccione…</option>
                  {catalogoMateriales
                    .filter(
                      (m) =>
                        m.activo && !matFilas.some((f) => f.materialId === String(m.id))
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                        {m.unidadMedida ? ` (${m.unidadMedida})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label>Cantidad</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={matNuevaCantidad}
                  onChange={(e) => setMatNuevaCantidad(e.target.value)}
                />
              </div>
            </div>
            <div className="acciones" style={{ marginBottom: 12 }}>
              <button className="btn btn-secundario" type="button" onClick={agregarMaterial}>
                Agregar
              </button>
            </div>

            {matError && <div className="alerta-error">{matError}</div>}

            <div className="acciones">
              <button className="btn" type="submit" disabled={matEnviando}>
                {matEnviando ? 'Guardando…' : 'Guardar materiales'}
              </button>
              <button
                className="btn btn-secundario"
                type="button"
                onClick={() => setMaterialesEdit(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {historial && (
        <Modal
          titulo={`Historial — OT #${historial.orden.numeroOT} (${historial.orden.tipoOT?.nombre})`}
          onCerrar={() => setHistorial(null)}
        >
          <div className="detalle-grid">
            <div className="detalle-item">
              <div className="etiqueta">Apellidos y nombre</div>
              <div className="valor">{historial.orden.apellidosNombre || '—'}</div>
            </div>
            <div className="detalle-item">
              <div className="etiqueta">Categoría</div>
              <div className="valor">{historial.orden.categoria?.nombre || '—'}</div>
            </div>
            <div className="detalle-item">
              <div className="etiqueta">Descripción</div>
              <div className="valor">{historial.orden.descripcion || '—'}</div>
            </div>
            <div className="detalle-item">
              <div className="etiqueta">Materiales</div>
              <div className="valor">
                {historial.orden.materiales?.length
                  ? historial.orden.materiales
                      .map(
                        (m) =>
                          `${m.material?.nombre ?? '—'} × ${m.cantidad ?? '—'}${
                            m.material?.unidadMedida ? ` ${m.material.unidadMedida}` : ''
                          }`
                      )
                      .join(', ')
                  : '—'}
              </div>
            </div>
            <div className="detalle-item">
              <div className="etiqueta">Estado actual</div>
              <div className="valor">{historial.orden.estado?.nombre}</div>
            </div>
            <div className="detalle-item">
              <div className="etiqueta">Ubicación</div>
              <div className="valor">{historial.orden.ubicacion || '—'}</div>
            </div>
            <div className="detalle-item">
              <div className="etiqueta">Registrada por</div>
              <div className="valor">
                {historial.orden.registradoPor?.nombres}{' '}
                {historial.orden.registradoPor?.apellidos}
              </div>
            </div>
            <div className="detalle-item">
              <div className="etiqueta">Fecha de registro</div>
              <div className="valor">
                {new Date(historial.orden.fechaRegistro).toLocaleString()}
              </div>
            </div>
          </div>

          {historial.hist.length === 0 ? (
            <div className="vacio">Sin movimientos registrados</div>
          ) : (
            historial.hist.map((h) => (
              <div className="historial-item" key={h.id}>
                <div className="accion">{h.accion}</div>
                <div className="meta">
                  {new Date(h.fecha).toLocaleString()} — {h.usuario?.nombres}{' '}
                  {h.usuario?.apellidos}
                  {h.estadoAnterior && h.estadoNuevo
                    ? ` · ${h.estadoAnterior.nombre} → ${h.estadoNuevo.nombre}`
                    : h.estadoNuevo
                      ? ` · ${h.estadoNuevo.nombre}`
                      : ''}
                </div>
                {h.observacion && <div className="meta">{h.observacion}</div>}
              </div>
            ))
          )}
        </Modal>
      )}
    </>
  )
}
