import { Link, Outlet } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import ControlesPanel from '../components/panel/ControlesPanel'

export default function PanelLayout() {
  return (
    <div className="panel-root">
      <header className="sigot-header">
        <Link to="/panel" className="sigot-brand" title="Volver al Panel de trabajo">
          <span className="sigot-logo">
            <LayoutGrid size={20} strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="sigot-nombres">
            <strong>SIGOT</strong>
            <span className="sigot-full">
              Sistema de Gestión y Seguimiento de Órdenes de Trabajo
            </span>
          </span>
        </Link>

        <div className="sigot-usuario">
          <ControlesPanel variante="panel" />
        </div>
      </header>

      <Outlet />
    </div>
  )
}
