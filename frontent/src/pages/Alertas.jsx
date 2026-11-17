import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { api } from '../api/api'
import { invalidarAlertas, obtenerAlertas } from '../api/alertasCache'

function badgeAlerta(estado) {
  const clase =
    estado === 'PENDIENTE' ? 'badge-pendiente'
    : estado === 'ATENDIDA' ? 'badge-atendida'
    : 'badge-descartada'
  return <span className={`badge ${clase}`}>{estado}</span>
}

export default function Alertas() {
  const [todas, setTodas] = useState([])
  const [mias, setMias] = useState([])
  const [error, setError] = useState('')
  const [mensajeOk, setMensajeOk] = useState('')

  function cargar() {
    api.get('/alertas').then(setTodas).catch((err) => setError(err.message))
    obtenerAlertas().then(setMias).catch(() => setMias([]))
  }

  useEffect(() => {
    cargar()
  }, [])

  async function accion(id, tipo) {
    setError('')
    setMensajeOk('')
    try {
      await api.patch(`/alertas/${id}/${tipo}`, { observacion: `${tipo} desde panel` })
      setMensajeOk(tipo === 'atender' ? 'Alerta atendida' : 'Alerta descartada')
      invalidarAlertas()
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <h1 className="page-title">Alertas</h1>
      <p className="page-subtitle">Supervisión de alertas del sistema</p>

      {error && <div className="alerta-error">{error}</div>}
      {mensajeOk && <div className="alerta-ok">{mensajeOk}</div>}

      <div className="card">
        <h2>Mis alertas pendientes ({mias.length})</h2>
        {mias.length === 0 ? (
          <div className="vacio">No tienes alertas pendientes</div>
        ) : (
          <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>OT</th>
                <th>Tipo</th>
                <th>Generada</th>
                <th>Días (máx.)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
                {mias.map((d) => {
                  const a = d.alerta
                  return (
                    <tr key={d.id}>
                      <td data-label="OT">#{a?.ordenTrabajo?.numeroOT}</td>
                      <td data-label="Tipo">{a?.tipoAlerta}</td>
                      <td data-label="Generada">{new Date(a?.fechaGeneracion).toLocaleString()}</td>
                      <td data-label="Días (máx.)">
                        {a?.diasHabilesTranscurridos} / {a?.diasHabilesMaximos}
                      </td>
                      <td data-label="">
                        <div className="acciones-fila">
                          <button
                            type="button"
                            className="btn-icono"
                            title="Atender"
                            aria-label="Atender"
                            onClick={() => accion(a.id, 'atender')}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-icono btn-icono-peligro"
                            title="Descartar"
                            aria-label="Descartar"
                            onClick={() => accion(a.id, 'descartar')}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Todas las alertas</h2>
        {todas.length === 0 ? (
          <div className="vacio">No hay alertas registradas</div>
        ) : (
          <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>OT</th>
                <th>Tipo</th>
                <th>Generada</th>
                <th>Días (máx.)</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {todas.map((a) => (
                <tr key={a.id}>
                  <td data-label="OT">#{a.ordenTrabajo?.numeroOT}</td>
                  <td data-label="Tipo">{a.tipoAlerta}</td>
                  <td data-label="Generada">{new Date(a.fechaGeneracion).toLocaleString()}</td>
                  <td data-label="Días (máx.)">
                    {a.diasHabilesTranscurridos} / {a.diasHabilesMaximos}
                  </td>
                  <td data-label="Estado">{badgeAlerta(a.estadoAlerta)}</td>
                  <td data-label="">
                    {a.estadoAlerta === 'PENDIENTE' && (
                      <div className="acciones-fila">
                        <button
                          type="button"
                          className="btn-icono"
                          title="Atender"
                          aria-label="Atender"
                          onClick={() => accion(a.id, 'atender')}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icono btn-icono-peligro"
                          title="Descartar"
                          aria-label="Descartar"
                          onClick={() => accion(a.id, 'descartar')}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  )
}
