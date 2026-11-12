const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = '/login'
    throw new Error('Sesión expirada')
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)

  if (res.status === 403 && data?.codigo === 'CAMBIO_CREDENCIALES_REQUERIDO') {
    localStorage.setItem('cambioPendiente', '1')
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new Error(data.mensaje || 'Debes cambiar tu contraseña para continuar')
  }

  if (!res.ok) {
    const error = new Error(data?.mensaje || `Error ${res.status}`)
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),

  // Auth
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    localStorage.setItem('modulos', JSON.stringify(data.modulos || []))
    return data
  },
  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    localStorage.removeItem('modulos')
    window.location.href = '/login'
  },
  getUsuario() {
    const raw = localStorage.getItem('usuario')
    return raw ? JSON.parse(raw) : null
  },
  async getModulos() {
    const raw = localStorage.getItem('modulos')
    if (raw) return JSON.parse(raw)
    const me = await request('/auth/me')
    localStorage.setItem('modulos', JSON.stringify(me.modulos || []))
    return me.modulos || []
  },
}
