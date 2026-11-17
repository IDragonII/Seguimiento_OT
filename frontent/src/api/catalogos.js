import { api } from './api'

// Cache simple por URL: una sola petición por sesión.
// Los catálogos (tipos, categorías, materiales, estados) son datos estáticos
// que rara vez cambian, así que guardar el resultado evita requests repetidos.
const catalogosCache = new Map()

// Devolverá el dato en caché o hará la petición y lo guardará.
export function obtener(url) {
  if (catalogosCache.has(url)) {
    return Promise.resolve(catalogosCache.get(url))
  }
  return api.get(url).then((data) => {
    catalogosCache.set(url, data)
    return data
  })
}

// Invalidar uno o varios catálogos (llamar después de mutaciones).
export function invalidar(...urls) {
  urls.forEach((u) => catalogosCache.delete(u))
}

// Alias para compatibilidad: obtener y guardar
export { obtener as getCatalogos }