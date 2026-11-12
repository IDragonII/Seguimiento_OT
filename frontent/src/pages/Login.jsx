import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import CambioCredencialesModal from '../components/CambioCredencialesModal'
import PantallaCargaServidor from '../components/PantallaCargaServidor'

async function sondearServidor(ctrl) {
  try {
    const res = await fetch('/v3/api-docs', {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    })
    return res.ok
  } catch {
    // red caída o servidor aún sin responder
    return false
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [cambioPendiente, setCambioPendiente] = useState(
    () => localStorage.getItem('cambioPendiente') === '1'
  )
  const [servidorDespierto, setServidorDespierto] = useState(false)
  const [despertando, setDespertando] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('token')) return
    const ctrl = new AbortController()
    let vivo = true
    const textoDespertando = setTimeout(() => {
      if (vivo) setDespertando(true)
    }, 3000)

    async function vigilar() {
      while (vivo) {
        const despierto = await sondearServidor(ctrl)
        if (!vivo) return
        if (despierto) {
          clearTimeout(textoDespertando)
          setServidorDespierto(true)
          return
        }
        setDespertando(true)
        await new Promise((r) => setTimeout(r, 4000))
      }
    }

    vigilar()
    return () => {
      vivo = false
      clearTimeout(textoDespertando)
      ctrl.abort()
    }
  }, [])

  if (localStorage.getItem('token')) {
    if (cambioPendiente) {
      return <CambioCredencialesModal forzado />
    }
    const guardado = api.getUsuario()
    return <Navigate to={guardado?.rol === 'ADMIN' ? '/' : '/panel'} replace />
  }

  if (!servidorDespierto) {
    return <PantallaCargaServidor despertando={despertando} />
  }

  async function manejarSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const data = await api.login(email, password)
      if (data.debeCambiarCredenciales) {
        localStorage.setItem('cambioPendiente', '1')
        setCambioPendiente(true)
        return
      }
      localStorage.removeItem('cambioPendiente')
      const usuario = api.getUsuario()
      navigate(usuario?.rol === 'ADMIN' ? '/' : '/panel', { replace: true })
    } catch (err) {
      setError(err.message || 'Credenciales inválidas')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={manejarSubmit}>
        <h1>Órdenes de Trabajo</h1>
        <p>Inicia sesión para continuar</p>

        {error && <div className="alerta-error">{error}</div>}

        <div className="formulario">
          <div>
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ot.local"
              required
              autoFocus
            />
          </div>
          <div>
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn" type="submit" disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>
      </form>
    </div>
  )
}
