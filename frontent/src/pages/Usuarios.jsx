import { useEffect, useState } from 'react'
import { api } from '../api/api'
import Modal from '../components/Modal'

const VACIO = { nombres: '', apellidos: '', email: '', password: '', rolId: '' }

const ROLES = [
  { id: 1, nombre: 'ADMIN' },
  { id: 2, nombre: 'FACTIBILIZADOR' },
  { id: 3, nombre: 'TECNICO' },
  { id: 4, nombre: 'CONSULTOR' },
]

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState('')
  const [mensajeOk, setMensajeOk] = useState('')
  const [form, setForm] = useState(VACIO)
  const [editandoId, setEditandoId] = useState(null)
  const [formAbierto, setFormAbierto] = useState(false)

  function cargar() {
    api
      .get('/usuarios')
      .then(setUsuarios)
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
      const payload = {
        nombres: form.nombres,
        apellidos: form.apellidos,
        email: form.email,
        rolId: Number(form.rolId),
        ...(form.password ? { password: form.password } : {}),
      }
      if (editandoId) {
        await api.put(`/usuarios/${editandoId}`, payload)
        setMensajeOk('Usuario actualizado')
      } else {
        await api.post('/usuarios', payload)
        setMensajeOk('Usuario creado')
      }
      setForm(VACIO)
      setEditandoId(null)
      setFormAbierto(false)
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  function editar(u) {
    setEditandoId(u.id)
    setForm({
      nombres: u.nombres,
      apellidos: u.apellidos,
      email: u.email,
      password: '',
      rolId: u.rol?.id || '',
    })
    setFormAbierto(true)
  }

  function nuevo() {
    setEditandoId(null)
    setForm(VACIO)
    setFormAbierto(true)
  }

  function cancelar() {
    setFormAbierto(false)
    setEditandoId(null)
    setForm(VACIO)
  }

  async function cambiarEstado(u) {
    setError('')
    setMensajeOk('')
    try {
      await api.patch(`/usuarios/${u.id}/estado`, { activo: !u.activo })
      setMensajeOk(`Usuario ${u.activo ? 'desactivado' : 'activado'}`)
      cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <h1 className="page-title">Usuarios</h1>
      <p className="page-subtitle">Gestión de usuarios y roles del sistema</p>

      {error && <div className="alerta-error">{error}</div>}
      {mensajeOk && <div className="alerta-ok">{mensajeOk}</div>}

      {formAbierto && (
        <Modal
          titulo={editandoId ? `Editar usuario #${editandoId}` : 'Nuevo usuario'}
          onCerrar={cancelar}
          ancho={640}
        >
          <form className="formulario" onSubmit={guardar}>
            <div className="fila">
              <div>
                <label>Nombres</label>
                <input
                  value={form.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Apellidos</label>
                <input
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="fila">
              <div>
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Rol</label>
                <select
                  value={form.rolId}
                  onChange={(e) => setForm({ ...form, rolId: e.target.value })}
                  required
                >
                  <option value="">Seleccione…</option>
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Contraseña {editandoId && '(vacío = mantener)'}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editandoId}
                />
              </div>
            </div>
            <div className="acciones">
              <button className="btn" type="submit">
                {editandoId ? 'Guardar cambios' : 'Crear usuario'}
              </button>
              <button className="btn btn-secundario" type="button" onClick={cancelar}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="card">
        <div className="toolbar">
          <button className="btn" type="button" onClick={nuevo}>
            Nuevo usuario
          </button>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            {usuarios.length} usuario(s)
          </span>
        </div>
        {usuarios.length === 0 ? (
          <div className="vacio">No hay usuarios</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td data-label="#">{u.id}</td>
                  <td data-label="Nombre">
                    {u.nombres} {u.apellidos}
                  </td>
                  <td data-label="Correo">{u.email}</td>
                  <td data-label="Rol">
                    <span className="badge badge-rol">{u.rol?.nombre}</span>
                  </td>
                  <td data-label="Estado">
                    <span className={`badge ${u.activo ? 'badge-cerrado' : 'badge-descartada'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td data-label="">
                    <div className="acciones">
                      <button className="btn btn-secundario btn-chico" onClick={() => editar(u)}>
                        Editar
                      </button>
                      <button
                        className={`btn btn-chico ${u.activo ? 'btn-peligro' : ''}`}
                        onClick={() => cambiarEstado(u)}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
