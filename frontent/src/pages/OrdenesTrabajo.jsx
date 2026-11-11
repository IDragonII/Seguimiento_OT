import { useEffect, useState } from 'react'
import { api } from '../api/api'
import Modal from '../components/Modal'

export default function OrdenesTrabajo() {
  const usuario = api.getUsuario()
  const puedeCrear = ['ADMIN', 'FACTIBILIZADOR'].includes(usuario.rol)

  const [ordenes, setOrdenes] = useState([])
  const [tipos, setTipos] = useState([])
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [historial, setHistorial] = useState(null)

  const [form, setForm] = useState({ tipoOTId: '', numeroOT: '', descripcion: '' })
  const [formAbierto, setFormAbierto] = useState(false)
  const [mensajeOk, setMensajeOk] = useState('')

  function cargar() {
    api
      .get('/ordenes-trabajo')
      .then(setOrdenes)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    cargar()
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
        descripcion: form.descripcion,
      })
      setMensajeOk('OT registrada correctamente')
      setForm({ tipoOTId: '', numeroOT: '', descripcion: '' })
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

  const filtradas = ordenes.filter((o) => {
    const coincideBusqueda =
      !busqueda ||
      String(o.numeroOT).includes(busqueda) ||
      o.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      o.tipoOT?.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado = !filtroEstado || o.estado?.nombre === filtroEstado
    return coincideBusqueda && coincideEstado
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
              placeholder="Buscar por número, tipo o descripción…"
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
                <th>Descripción</th>
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
                  <td data-label="Descripción">{o.descripcion || '—'}</td>
                  <td data-label="Estado">
                    <span className={`badge badge-${o.estado?.nombre.toLowerCase()}`}>
                      {o.estado?.nombre}
                    </span>
                  </td>
                  <td data-label="Ubicación">{o.ubicacion || '—'}</td>
                  <td data-label="Registro">{new Date(o.fechaRegistro).toLocaleDateString()}</td>
                  <td data-label="">
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

      {historial && (
        <Modal
          titulo={`Historial — OT #${historial.orden.numeroOT} (${historial.orden.tipoOT?.nombre})`}
          onCerrar={() => setHistorial(null)}
        >
          <div className="detalle-grid">
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
