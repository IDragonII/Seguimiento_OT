import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal'
import { api } from '../api/api'

export default function CambioCredencialesModal({ forzado = true }) {
  const usuario = api.getUsuario()
  const [form, setForm] = useState({
    nombres: usuario?.nombres || '',
    apellidos: usuario?.apellidos || '',
    email: usuario?.email || '',
    password: '',
    repetir: '',
  })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  async function guardar(e) {
    e.preventDefault()
    setError('')

    if (!form.nombres.trim() || !form.apellidos.trim()) {
      setError('Nombres y apellidos son obligatorios')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('El email no tiene un formato válido')
      return
    }
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número')
      return
    }
    if (form.password !== form.repetir) {
      setError('Las contraseñas no coinciden')
      return
    }

    setCargando(true)
    try {
      const data = await api.put('/auth/cambio-inicial', {
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        email: form.email.trim(),
        nuevaPassword: form.password,
      })
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      localStorage.setItem('modulos', JSON.stringify(data.modulos || []))
      localStorage.removeItem('cambioPendiente')
      navigate(data.usuario?.rol === 'ADMIN' ? '/' : '/panel', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal titulo="Cambia tus credenciales" ancho={640} forzado={forzado} onCerrar={() => {}}>
      <p className="cambio-inicial-aviso">
        Por seguridad debes cambiar tu nombre, email y contraseña antes de continuar.
      </p>
      <form className="formulario" onSubmit={guardar} data-cambio-credenciales>
        {error && (
          <div className="alerta-error" data-cambio-error>
            {error}
          </div>
        )}
        <div className="fila">
          <div>
            <label>Nombres</label>
            <input
              value={form.nombres}
              onChange={(e) => setForm({ ...form, nombres: e.target.value })}
              required
              autoFocus
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
        <div>
          <label>Correo electrónico</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="fila">
          <div>
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Repetir contraseña</label>
            <input
              type="password"
              value={form.repetir}
              onChange={(e) => setForm({ ...form, repetir: e.target.value })}
              required
            />
          </div>
        </div>
        <p className="cambio-inicial-requisitos">
          Mínimo 8 caracteres con una mayúscula y un número.
        </p>
        <div className="acciones">
          <button className="btn" type="submit" disabled={cargando}>
            {cargando ? 'Guardando…' : 'Guardar y continuar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
