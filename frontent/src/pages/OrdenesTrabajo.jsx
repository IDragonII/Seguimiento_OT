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
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [historial, setHistorial] = useState(null)

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
                      <button
                        className="btn btn-secundario btn-chico"
                        style={{ marginRight: 6 }}
                        onClick={() => abrirEdicion(o)}
                      >
                        Editar
                      </button>
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
