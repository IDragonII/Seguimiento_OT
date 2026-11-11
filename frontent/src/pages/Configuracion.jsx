import { useEffect, useState } from 'react'
import { api } from '../api/api'
import Modal from '../components/Modal'

export default function Configuracion() {
  const [configs, setConfigs] = useState([])
  const [estados, setEstados] = useState([])
  const [error, setError] = useState('')
  const [mensajeOk, setMensajeOk] = useState('')
  const [edicion, setEdicion] = useState({})
  const [nueva, setNueva] = useState({ estadoId: '', diasHabilesMaximos: 3 })
  const [formAbierto, setFormAbierto] = useState(false)
  const [confirmacion, setConfirmacion] = useState(null)

  function cargar() {
    api
      .get('/configuracion/tiempos-ot')
      .then(setConfigs)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    cargar()
    api.get('/estados').then(setEstados).catch(() => setEstados([]))
  }, [])

  async function guardar(c) {
    setError('')
    setMensajeOk('')
    try {
      await api.put(`/configuracion/tiempos-ot/${c.id}`, {
        diasHabilesMaximos: Number(edicion[c.id] ?? c.diasHabilesMaximos),
      })
      setMensajeOk('Tiempo máximo actualizado')
      setEdicion({})
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function crear(e) {
    e.preventDefault()
    setError('')
    setMensajeOk('')
    try {
      await api.post('/configuracion/tiempos-ot', {
        estadoId: Number(nueva.estadoId),
        diasHabilesMaximos: Number(nueva.diasHabilesMaximos),
      })
      setMensajeOk('Configuración creada')
      setNueva({ estadoId: '', diasHabilesMaximos: 3 })
      setFormAbierto(false)
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function alternarLimite() {
    if (!confirmacion) return
    setError('')
    setMensajeOk('')
    const activo = !confirmacion.activo
    try {
      await api.patch(`/configuracion/tiempos-ot/${confirmacion.id}/limite`, { activo })
      setMensajeOk(
        activo
          ? `El estado ${confirmacion.nombre} vuelve a tener tiempo límite`
          : `El estado ${confirmacion.nombre} quedó sin tiempo límite`,
      )
      setConfirmacion(null)
      cargar()
    } catch (err) {
      setError(err.message)
      setConfirmacion(null)
    }
  }

  const estadosSinConfig = estados.filter(
    (e) => !configs.some((c) => c.estado?.id === e.id),
  )

  return (
    <>
      <h1 className="page-title">Configuración</h1>
      <p className="page-subtitle">Tiempos máximos de permanencia por estado</p>

      {error && <div className="alerta-error">{error}</div>}
      {mensajeOk && <div className="alerta-ok">{mensajeOk}</div>}

      <div className="card">
        <div className="toolbar">
          <button
            className="btn"
            type="button"
            onClick={() => setFormAbierto(true)}
            disabled={estadosSinConfig.length === 0}
          >
            Nuevo tiempo máximo
          </button>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            {configs.length} configuración(es)
          </span>
        </div>

        {configs.length === 0 ? (
          <div className="vacio">No hay configuraciones</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Días hábiles máximos</th>
                <th>Última actualización</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => {
                const conLimite = c.activo !== false
                return (
                  <tr key={c.id}>
                    <td data-label="Estado">
                      <span className={`badge badge-${c.estado?.nombre.toLowerCase()}`}>
                        {c.estado?.nombre}
                      </span>
                    </td>
                    <td data-label="Días hábiles">
                      {conLimite ? (
                        <input
                          type="number"
                          min="1"
                          style={{ width: 90 }}
                          value={edicion[c.id] ?? c.diasHabilesMaximos}
                          onChange={(e) =>
                            setEdicion({ ...edicion, [c.id]: e.target.value })
                          }
                        />
                      ) : (
                        <span className="badge badge-descartada">Sin límite</span>
                      )}
                    </td>
                    <td data-label="Actualización">
                      {new Date(c.fechaActualizacion).toLocaleDateString()}
                    </td>
                    <td data-label="">
                      <div style={{ display: 'flex', gap: 6 }}>
                        {conLimite && (
                          <button className="btn btn-chico" onClick={() => guardar(c)}>
                            Guardar
                          </button>
                        )}
                        <button
                          className={`btn btn-chico ${conLimite ? 'btn-peligro' : ''}`}
                          onClick={() =>
                            setConfirmacion({
                              id: c.id,
                              nombre: c.estado?.nombre || '',
                              activo: conLimite,
                            })
                          }
                        >
                          {conLimite ? 'Sin límite' : 'Poner límite'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {formAbierto && (
        <Modal
          titulo="Configurar tiempo máximo de un estado"
          onCerrar={() => setFormAbierto(false)}
          ancho={520}
        >
          <form className="formulario" onSubmit={crear}>
            <div className="fila">
              <div>
                <label>Estado</label>
                <select
                  value={nueva.estadoId}
                  onChange={(e) => setNueva({ ...nueva, estadoId: e.target.value })}
                  required
                >
                  <option value="">Seleccione…</option>
                  {estadosSinConfig.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Días hábiles máximos</label>
                <input
                  type="number"
                  min="1"
                  value={nueva.diasHabilesMaximos}
                  onChange={(e) =>
                    setNueva({ ...nueva, diasHabilesMaximos: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="acciones">
              <button className="btn" type="submit">
                Crear configuración
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

      {confirmacion && (
        <Modal
          titulo={
            confirmacion.activo
              ? 'Quitar tiempo límite'
              : 'Restaurar tiempo límite'
          }
          onCerrar={() => setConfirmacion(null)}
          ancho={480}
        >
          <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>
            {confirmacion.activo ? (
              <>
                El estado <strong>{confirmacion.nombre}</strong> quedará{' '}
                <strong>sin tiempo límite máximo</strong>: no se generarán
                alertas de vencimiento para las OT que se encuentren en ese
                estado.
              </>
            ) : (
              <>
                El estado <strong>{confirmacion.nombre}</strong> volverá a tener{' '}
                <strong>tiempo límite máximo</strong> con los días hábiles
                configurados y comenzará a generar alertas de vencimiento.
              </>
            )}
          </p>
          <div className="acciones">
            <button className="btn" type="button" onClick={alternarLimite}>
              Confirmar
            </button>
            <button
              className="btn btn-secundario"
              type="button"
              onClick={() => setConfirmacion(null)}
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
