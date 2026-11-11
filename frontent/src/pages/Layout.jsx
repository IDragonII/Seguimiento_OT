import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { api } from '../api/api'

const MENU = [
  { titulo: 'Operación', items: [
    { ruta: '/', etiqueta: 'Dashboard', roles: ['ADMIN'] },
    { ruta: '/ordenes-trabajo', etiqueta: 'Órdenes de trabajo', roles: ['ADMIN'] },
    { ruta: '/entregas', etiqueta: 'Entregas', roles: ['ADMIN'] },
    { ruta: '/ot-por-tecnico', etiqueta: 'OT por técnico', roles: ['ADMIN'] },
    { ruta: '/alertas', etiqueta: 'Alertas', roles: ['ADMIN'] },
  ]},
  { titulo: 'Administración', items: [
    { ruta: '/usuarios', etiqueta: 'Usuarios', roles: ['ADMIN'] },
    { ruta: '/configuracion', etiqueta: 'Configuración', roles: ['ADMIN'] },
  ]},
]

export default function Layout() {
  const usuario = api.getUsuario()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setMenuAbierto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function cerrarSesion() {
    api.logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          type="button"
          className="menu-toggle"
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto((v) => !v)}
        >
          ☰
        </button>
        <div className="topbar-brand">Gestión OT</div>
      </header>

      <aside className={menuAbierto ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-brand">
          Gestión OT
          <span>Sistema de Órdenes de Trabajo</span>
        </div>

        <nav>
          {MENU.map((seccion) => {
            const visibles = seccion.items.filter(
              (item) => !item.roles || item.roles.includes(usuario.rol),
            )
            if (visibles.length === 0) return null
            return (
              <div key={seccion.titulo}>
                <div className="nav-section">{seccion.titulo}</div>
                {visibles.map((item) => (
                  <NavLink
                    key={item.ruta}
                    to={item.ruta}
                    end={item.ruta === '/'}
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      isActive ? 'nav-link active' : 'nav-link'
                    }
                  >
                    {item.etiqueta}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-user">
          <div className="nombre">
            {usuario.nombres} {usuario.apellidos}
          </div>
          <div className="rol">{usuario.rol}</div>
          <button
            type="button"
            onClick={() => {
              setMenuAbierto(false)
              cerrarSesion()
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {menuAbierto && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
