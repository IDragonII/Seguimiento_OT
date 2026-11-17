import { api } from './api'

// Cache con TTL de 60 segundos para /alertas/mis-alertas,
// ya que ambas vistas (CentroTrabajo y ControlesPanel) la piden.
// Evita la petición duplicada en cada render/ciclo.
const alertasCache = {
    datos: null,
    timestamp: 0,
    get edad() { return Date.now() - this.timestamp },
    get esViejo() { return this.edad > 60000 },
}

export function obtenerAlertas() {
    if (!alertasCache.esViejo) {
        return Promise.resolve(alertasCache.datos)
    }
    return api.get('/alertas/mis-alertas').then((data) => {
        alertasCache.datos = data
        alertasCache.timestamp = Date.now()
        return data
    })
}

export function invalidarAlertas() {
    alertasCache.datos = null
    alertasCache.timestamp = 0
  }