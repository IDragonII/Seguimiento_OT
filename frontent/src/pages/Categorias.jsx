import { useEffect, useState } from 'react'
import { api } from '../api/api'
import Modal from '../components/Modal'

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [error, setError] = useState('')
  const [mensajeOk, setMensajeOk] = useState('')

  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nombre, setNombre] = useState('')

  function cargar() {
    api
      .get('/categorias')
      .then(setCategorias)
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
        await api.put(`/categorias/${editando.id}`, { nombre })
        setMensajeOk('Categoría actualizada')
      } else {
        await api.post('/categorias', { nombre })
        setMensajeOk('Categoría creada')
      }
      setFormAbierto(false)
      setEditando(null)
      setNombre('')
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function alternarActivo(cat) {
    setError('')
    setMensajeOk('')
    try {
      await api.patch(`/categorias/${cat.id}/activo`, { activo: !cat.activo })
      setMensajeOk(
        `Categoría ${cat.nombre} ${cat.activo ? 'desactivada' : 'activada'}`
      )
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  function abrirNuevo() {
    setEditando(null)
    setNombre('')
    setFormAbierto(true)
  }

  function abrirEdicion(cat) {
    setEditando(cat)
    setNombre(cat.nombre)
    setFormAbierto(true)
  }

  return (
    <>
      <h1 className="page-title">Categorías de OT</h1>
      <p className="page-subtitle">Categorías eléctricas asignadas a las órdenes de trabajo</p>

      {error && <div className="alerta-error">{error}</div>}
      {mensajeOk && <div className="alerta-ok">{mensajeOk}</div>}

      <div className="card">
        <div className="toolbar">
          <div className="acciones">
            <button className="btn" type="button" onClick={abrirNuevo}>
              Nueva categoría
            </button>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            {categorias.length} resultado(s)
          </span>
        </div>

        {categorias.length === 0 ? (
          <div className="vacio">No hay categorías registradas</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id}>
                  <td data-label="#">{c.id}</td>
                  <td data-label="Nombre">{c.nombre}</td>
                  <td data-label="Estado">
                    <span className={`badge ${c.activo ? 'badge-programado' : 'badge-cerrado'}`}>
                      {c.activo ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </td>
                  <td data-label="">
                    <button
                      className="btn btn-secundario btn-chico"
                      style={{ marginRight: 6 }}
                      onClick={() => abrirEdicion(c)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-secundario btn-chico"
                      onClick={() => alternarActivo(c)}
                    >
                      {c.activo ? 'Desactivar' : 'Activar'}
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
          titulo={editando ? 'Editar categoría' : 'Nueva categoría'}
          onCerrar={() => setFormAbierto(false)}
          ancho={440}
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
            <div className="acciones">
              <button className="btn" type="submit">
                {editando ? 'Guardar cambios' : 'Crear categoría'}
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
