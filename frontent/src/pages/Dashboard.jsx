import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api/api'

const COLORES_ESTADO = {
  PROGRAMADO: '#3b82f6',
  ENTREGADO: '#f59e0b',
  DEVUELTO: '#ea580c',
  CERRADO: '#22c55e',
}

const PALETA_TIPOS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
]

const ESTADOS_BASE = ['PROGRAMADO', 'ENTREGADO', 'DEVUELTO', 'CERRADO']

const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

function badgeEstado(nombre) {
  return <span className={`badge badge-${(nombre || '').toLowerCase()}`}>{nombre}</span>
}

function badgeAlerta(estado) {
  const clase =
    estado === 'PENDIENTE' ? 'badge-pendiente'
    : estado === 'ATENDIDA' ? 'badge-atendida'
    : 'badge-descartada'
  return <span className={`badge ${clase}`}>{estado}</span>
}

function construirSerieMensual(ordenes) {
  const hoy = new Date()
  const meses = []
  for (let i = 5; i >= 0; i--) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    meses.push({
      anio: f.getFullYear(),
      mes: f.getMonth(),
      nombre: MESES[f.getMonth()],
      cantidad: 0,
    })
  }
  ordenes.forEach((o) => {
    const f = new Date(o.fechaRegistro)
    const ref = meses.find((m) => m.mes === f.getMonth() && m.anio === f.getFullYear())
    if (ref) ref.cantidad += 1
  })
  return meses.map(({ nombre, cantidad }) => ({ nombre, cantidad }))
}

export default function Dashboard() {
  const usuario = api.getUsuario()
  const esAdmin = usuario?.rol === 'ADMIN'

  const [ordenes, setOrdenes] = useState([])
  const [alertas, setAlertas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (esAdmin) {
      api.get('/ordenes-trabajo').then(setOrdenes).catch((err) => setError(err.message))
      api.get('/alertas').then(setAlertas).catch(() => setAlertas([]))
      api.get('/usuarios').then(setUsuarios).catch(() => setUsuarios([]))
    } else {
      api
        .get('/entregas/mis-ot')
        .then((detalles) => setOrdenes(detalles.map((d) => d.ordenTrabajo).filter(Boolean)))
        .catch((err) => setError(err.message))
      api
        .get('/alertas/mis-alertas')
        .then((lista) => setAlertas(lista.map((d) => d.alerta).filter(Boolean)))
        .catch(() => setAlertas([]))
    }
  }, [esAdmin])

  const porEstado = (nombre) =>
    ordenes.filter((o) => o.estado?.nombre === nombre).length

  const datosEstados = ESTADOS_BASE.map((nombre) => ({
    nombre,
    cantidad: porEstado(nombre),
  }))

  const datosTipos = Object.entries(
    ordenes.reduce((acc, o) => {
      const tipo = o.tipoOT?.nombre || 'Sin tipo'
      acc[tipo] = (acc[tipo] || 0) + 1
      return acc
    }, {}),
  ).map(([nombre, cantidad]) => ({ nombre, cantidad }))

  const pendientes = alertas.filter((a) => a.estadoAlerta === 'PENDIENTE')
  const pendientesTop = pendientes.slice(0, 6)
  const serieMensual = construirSerieMensual(ordenes)
  const sinDatos = ordenes.length === 0

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Resumen general del sistema</p>

      {error && <div className="alerta-error">{error}</div>}

      <div className="grid grid-4">
        <div className="stat azul">
          <div className="valor">{ordenes.length}</div>
          <div className="etiqueta">Total de OT</div>
        </div>
        <div className="stat verde">
          <div className="valor">{porEstado('PROGRAMADO')}</div>
          <div className="etiqueta">Programadas</div>
        </div>
        <div className="stat naranja">
          <div className="valor">{porEstado('ENTREGADO')}</div>
          <div className="etiqueta">Entregadas</div>
        </div>
        <div className="stat rojo">
          <div className="valor">{porEstado('DEVUELTO')}</div>
          <div className="etiqueta">Devueltas</div>
        </div>
        <div className="stat cian">
          <div className="valor">{porEstado('CERRADO')}</div>
          <div className="etiqueta">Cerradas</div>
        </div>
        <div className="stat rojo">
          <div className="valor">{pendientes.length}</div>
          <div className="etiqueta">Alertas pendientes</div>
        </div>
        {esAdmin && (
          <div className="stat azul">
            <div className="valor">{usuarios.length}</div>
            <div className="etiqueta">Usuarios</div>
          </div>
        )}
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <h2>OT por estado</h2>
          {sinDatos ? (
            <div className="vacio">Aún no hay órdenes registradas</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={datosEstados}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
                <Tooltip />
                <Bar dataKey="cantidad" name="OT" radius={[4, 4, 0, 0]}>
                  {datosEstados.map((e) => (
                    <Cell key={e.nombre} fill={COLORES_ESTADO[e.nombre] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2>OT por tipo</h2>
          {sinDatos ? (
            <div className="vacio">Aún no hay órdenes registradas</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={datosTipos}
                  dataKey="cantidad"
                  nameKey="nombre"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {datosTipos.map((t, i) => (
                    <Cell key={t.nombre} fill={PALETA_TIPOS[i % PALETA_TIPOS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <h2>OT registradas por mes (últimos 6 meses)</h2>
          {sinDatos ? (
            <div className="vacio">Aún no hay órdenes registradas</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={serieMensual}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cantidad"
                  name="OT registradas"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2>Alertas pendientes ({pendientes.length})</h2>
          {pendientesTop.length === 0 ? (
            <div className="vacio">No hay alertas pendientes</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>OT</th>
                  <th>Tipo</th>
                  <th>Días (máx.)</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pendientesTop.map((a) => (
                  <tr key={a.id}>
                    <td data-label="OT">#{a.ordenTrabajo?.numeroOT}</td>
                    <td data-label="Tipo">{a.tipoAlerta}</td>
                    <td data-label="Días (máx.)">
                      {a.diasHabilesTranscurridos} / {a.diasHabilesMaximos}
                    </td>
                    <td data-label="Estado">{badgeAlerta(a.estadoAlerta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Actividad reciente</h2>
        {ordenes.length === 0 ? (
          <div className="vacio">Aún no hay órdenes registradas</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>OT</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Registrada</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {ordenes
                .slice()
                .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro))
                .slice(0, 8)
                .map((o) => (
                  <tr key={o.id}>
                    <td data-label="#">#{o.numeroOT}</td>
                    <td data-label="Tipo">{o.tipoOT?.nombre}</td>
                    <td data-label="Estado">{badgeEstado(o.estado?.nombre)}</td>
                    <td data-label="Registrada">
                      {new Date(o.fechaRegistro).toLocaleDateString()}
                    </td>
                    <td data-label="Responsable">
                      {o.registradoPor?.nombres} {o.registradoPor?.apellidos}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
