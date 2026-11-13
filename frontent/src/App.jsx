import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './pages/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OrdenesTrabajo from './pages/OrdenesTrabajo'
import Entregas from './pages/Entregas'
import Usuarios from './pages/Usuarios'
import Configuracion from './pages/Configuracion'
import Alertas from './pages/Alertas'
import PanelLayout from './layouts/PanelLayout'
import ModuloLayout from './layouts/ModuloLayout'
import Panel from './pages/Panel'
import CentroTrabajo from './pages/CentroTrabajo'
import MisDevoluciones from './pages/MisDevoluciones'
import MiHistorial from './pages/MiHistorial'
import OrdenesTrabajoPanel from './pages/OrdenesTrabajoPanel'
import EntregasPanel from './pages/EntregasPanel'
import ModuloProximamente from './components/panel/ModuloProximamente'

const ROLES_POR_RUTA = {
  '/usuarios': ['ADMIN'],
  '/configuracion': ['ADMIN'],
  '/entregas': ['ADMIN'],
  '/ot-por-tecnico': ['ADMIN'],
  '/ordenes-trabajo': ['ADMIN'],
  '/alertas': ['ADMIN'],
}

// Módulos del Panel de trabajo (rutas /panel/<key>)
// 'mis-ordenes' (Centro de trabajo) tiene su propia ruta más abajo.
const RUTAS_MODULO = [
  'mis-devoluciones',
  'mi-historial',
  'ordenes-trabajo',
  'entregas',
  'devoluciones',
  'seguimiento',
  'historial',
  'reportes',
  'revision',
  'alertas',
]

// Vistas construidas del Panel; el resto sigue como anuncio "próximamente".
const VISTAS_MODULO = {
  'mis-devoluciones': MisDevoluciones,
  'mi-historial': MiHistorial,
  'ordenes-trabajo': OrdenesTrabajoPanel,
  entregas: EntregasPanel,
}

function RequireAuth({ roles, children }) {
  const raw = localStorage.getItem('usuario')
  if (!raw) return <Navigate to="/login" replace />

  const usuario = JSON.parse(raw)
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to={usuario.rol === 'ADMIN' ? '/' : '/panel'} replace />
  }

  return children
}

// Rama del Panel: válida para cualquier rol autenticado salvo ADMIN.
function RequireNoAdmin({ children }) {
  const raw = localStorage.getItem('usuario')
  if (!raw) return <Navigate to="/login" replace />

  const usuario = JSON.parse(raw)
  if (usuario.rol === 'ADMIN') return <Navigate to="/" replace />

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* ============ Rama ADMIN (app existente, intacta) ============ */}
        <Route
          element={
            <RequireAuth roles={['ADMIN']}>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/ordenes-trabajo"
            element={
              <RequireAuth roles={ROLES_POR_RUTA['/ordenes-trabajo']}>
                <OrdenesTrabajo />
              </RequireAuth>
            }
          />
          <Route
            path="/entregas"
            element={
              <RequireAuth roles={ROLES_POR_RUTA['/entregas']}>
                <Entregas />
              </RequireAuth>
            }
          />
          <Route
            path="/ot-por-tecnico"
            element={
              <RequireAuth roles={ROLES_POR_RUTA['/ot-por-tecnico']}>
                <Entregas modo="por-tecnico" />
              </RequireAuth>
            }
          />
          <Route
            path="/usuarios"
            element={
              <RequireAuth roles={ROLES_POR_RUTA['/usuarios']}>
                <Usuarios />
              </RequireAuth>
            }
          />
          <Route
            path="/configuracion"
            element={
              <RequireAuth roles={ROLES_POR_RUTA['/configuracion']}>
                <Configuracion />
              </RequireAuth>
            }
          />
          <Route
            path="/alertas"
            element={
              <RequireAuth roles={ROLES_POR_RUTA['/alertas']}>
                <Alertas />
              </RequireAuth>
            }
          />
        </Route>

        {/* ============ Rama NUEVA — Panel de trabajo (no admin) ============ */}
        <Route
          element={
            <RequireNoAdmin>
              <PanelLayout />
            </RequireNoAdmin>
          }
        >
          <Route path="/panel" element={<Panel />} />
        </Route>

        <Route
          element={
            <RequireNoAdmin>
              <ModuloLayout />
            </RequireNoAdmin>
          }
        >
          <Route path="/panel/mis-ordenes" element={<CentroTrabajo />} />
          {RUTAS_MODULO.map((key) => {
            const Vista = VISTAS_MODULO[key]
            return (
              <Route
                key={key}
                path={`/panel/${key}`}
                element={Vista ? <Vista /> : <ModuloProximamente />}
              />
            )
          })}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
