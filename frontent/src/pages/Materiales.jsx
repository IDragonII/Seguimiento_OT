import { useEffect, useState } from 'react'
import { Pencil, Power, PowerOff } from 'lucide-react'
import { api } from '../api/api'
import { invalidar } from '../api/catalogos'
import Modal from '../components/Modal'

export default function Materiales() {
  const [materiales, setMateriales] = useState([])
  const [error, setError] = useState('')
  const [mensajeOk, setMensajeOk] = useState('')

  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nombre, setNombre] = useState('')
  const [unidadMedida, setUnidadMedida] = useState('')

  function cargar() {
    api
      .get('/materiales')
      .then(setMateriales)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    cargar()
  }, [])

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setMensajeOk('')
    try {
      if (editando) {
        await api.put(`/materiales/${editando.id}`, { nombre, unidadMedida })
        setMensajeOk('Material actualizado')
      } else {
        await api.post('/materiales', { nombre, unidadMedida })
        setMensajeOk('Material creado')
      }
      setFormAbierto(false)
      setEditando(null)
      setNombre('')
      setUnidadMedida('')
      invalidar('/materiales')
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function alternarActivo(material) {
    setError('')
    setMensajeOk('')
    try {
      await api.patch(`/materiales/${material.id}/activo`, { activo: !material.activo })
      setMensajeOk(
        `Material ${material.nombre} ${material.activo ? 'desactivado' : 'activado'}`
      )
      invalidar('/materiales')
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  function abrirNuevo() {
    setEditando(null)
    setNombre('')
    setUnidadMedida('')
    setFormAbierto(true)
  }

  function abrirEdicion(material) {
    setEditando(material)
    setNombre(material.nombre)
    setUnidadMedida(material.unidadMedida ?? '')
    setFormAbierto(true)
  }

  return (
    <>
      <h1 className="page-title">Materiales</h1>
      <p className="page-subtitle">Catálogo de materiales utilizados en las OT</p>

      {error && <div className="alerta-error">{error}</div>}
      {mensajeOk && <div className="alerta-ok">{mensajeOk}</div>}

      <div className="card">
        <div className="toolbar">
          <div className="acciones">
            <button className="btn" type="button" onClick={abrirNuevo}>
              Nuevo material
            </button>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            {materiales.length} resultado(s)
          </span>
        </div>

        {materiales.length === 0 ? (
          <div className="vacio">No hay materiales registrados</div>
        ) : (
          <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Unidad de medida</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {materiales.map((m) => (
                <tr key={m.id}>
                  <td data-label="#">{m.id}</td>
                  <td data-label="Nombre">{m.nombre}</td>
                  <td data-label="Unidad de medida">{m.unidadMedida || '—'}</td>
                  <td data-label="Estado">
                    <span className={`badge ${m.activo ? 'badge-programado' : 'badge-cerrado'}`}>
                      {m.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td data-label="">
                    <div className="acciones-fila">
                      <button
                        type="button"
                        className="btn-icono"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => abrirEdicion(m)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className={`btn-icono ${m.activo ? 'btn-icono-peligro' : ''}`}
                        title={m.activo ? 'Desactivar' : 'Activar'}
                        aria-label={m.activo ? 'Desactivar' : 'Activar'}
                        onClick={() => alternarActivo(m)}
                      >
                        {m.activo ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {formAbierto && (
        <Modal
          titulo={editando ? 'Editar material' : 'Nuevo material'}
          onCerrar={() => setFormAbierto(false)}
          ancho={460}
        >
          <form className="formulario" onSubmit={guardar}>
            <div>
              <label>Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Unidad de medida</label>
              <input
                type="text"
                placeholder="Ej: m, m², und, rollo…"
                value={unidadMedida}
                onChange={(e) => setUnidadMedida(e.target.value)}
              />
            </div>
            <div className="acciones">
              <button className="btn" type="submit">
                {editando ? 'Guardar cambios' : 'Crear material'}
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
    </>
  )
}
