import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../api/api'
import { BASE_PANEL, MODULOS, moduloPorRuta, rutaModulo } from '../components/panel/modulos'
import ControlesPanel from '../components/panel/ControlesPanel'
import RadialMenu from '../components/panel/RadialMenu'

export default function ModuloLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [modulos, setModulos] = useState([])

  useEffect(() => {
    api
      .getModulos()
      .then((keys) => setModulos(MODULOS.filter((m) => keys.includes(m.key))))
      .catch(() => setModulos([]))
  }, [])

  function irAModulo(key) {
    const ruta = rutaModulo(key)
    if (ruta !== pathname) navigate(ruta)
  }

  const items = modulos.map((m) => ({
    key: m.key,
    icon: m.icono,
    nombre: m.nombre,
  }))

  const moduloActual = moduloPorRuta(pathname)

  return (
    <div className="modulo-root">
      <header className="modulo-barra">
        <div className="modulo-izq">
          <Link to={BASE_PANEL} className="modulo-volver">
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Panel
          </Link>
          {moduloActual && (
            <span className="modulo-actual">{moduloActual.nombre}</span>
          )}
        </div>
        <div className="modulo-der">
          <div className="modulo-marca">SIGOT</div>
          <ControlesPanel variante="modulo" />
        </div>
      </header>

      <RadialMenu items={items} onSelect={irAModulo} />

      <Outlet />
    </div>
  )
}
