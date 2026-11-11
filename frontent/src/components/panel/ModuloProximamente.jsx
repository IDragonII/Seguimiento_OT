import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { moduloPorRuta } from './modulos'

export default function ModuloProximamente() {
  const { pathname } = useLocation()
  const modulo = moduloPorRuta(pathname)

  return (
    <div className="prox-main">
      <div className="prox-card">
        <div className="prox-icono">
          <Construction size={46} strokeWidth={1.6} aria-hidden="true" />
        </div>
        <h1 className="prox-titulo">{modulo?.nombre || 'Módulo'}</h1>
        <p className="prox-aviso">Presionaste este módulo.</p>
        <p className="prox-detalle">
          Su contenido se implementará paso a paso en los siguientes pasos de trabajo.
        </p>
      </div>
    </div>
  )
}
