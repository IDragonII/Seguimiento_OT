import { useEffect, useState } from 'react'
import { api } from '../api/api'
import ModuloCard from '../components/panel/ModuloCard'
import { MODULOS } from '../components/panel/modulos'

export default function Panel() {
  const [modulosPermitidos, setModulosPermitidos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getModulos()
      .then((keys) => setModulosPermitidos(keys))
      .catch((err) => setError(err.message || 'No se pudieron cargar los módulos'))
  }, [])

  const visibles = MODULOS.filter((m) => modulosPermitidos?.includes(m.key))

  return (
    <main className="panel-main">
      <div className="panel-encabezado">
        <h1>Panel de trabajo</h1>
        <p>Selecciona el módulo al que deseas ingresar</p>
      </div>

      {error && <div className="alerta-error">{error}</div>}

      {modulosPermitidos === null && !error && (
        <div className="panel-carga">Cargando módulos…</div>
      )}

      {modulosPermitidos !== null && modulosPermitidos.length === 0 && (
        <div className="panel-carga">Tu rol no tiene módulos asignados.</div>
      )}

      {visibles.length > 0 && (
        <div className="panel-grid">
          {visibles.map((m) => (
            <ModuloCard key={m.key} modulo={m} />
          ))}
        </div>
      )}
    </main>
  )
}
