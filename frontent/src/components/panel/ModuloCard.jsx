import { Link } from 'react-router-dom'
import { rutaModulo } from './modulos'

export default function ModuloCard({ modulo }) {
  const Icono = modulo.icono

  return (
    <Link to={rutaModulo(modulo.key)} className="modulo-card" title={modulo.descripcion}>
      <div className="modulo-icono">
        <Icono size={44} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <div className="modulo-nombre">{modulo.nombre}</div>
      <div className="modulo-desc">{modulo.descripcion}</div>
      <span className="modulo-flecha" aria-hidden="true">
        →
      </span>
    </Link>
  )
}
