import * as XLSX from 'xlsx'

// Umbral de presupuesto: por encima se importa como Trifásica.
export const UMBRAL_TRIFASICA = 600

// Columnas conocidas del Excel oficial. Se resuelven por nombre de encabezado,
// nunca por posición fija: así una planilla con columnas extra o en otro orden
// sigue funcionando.
const CAMPOS = [
  { clave: 'nro', etiquetas: ['NRO.', 'NRO', 'N°', 'NUMERO', 'NUM'] },
  { clave: 'codigo', etiquetas: ['CODIGO ORDEN TRABAJO', 'CODIGO OT', 'CODIGO'] },
  { clave: 'cliente', etiquetas: ['APELLIDOS Y NOMBRES', 'APELLIDOS NOMBRE', 'NOMBRE', 'CLIENTE'] },
  { clave: 'direccion', etiquetas: ['DIRECCION DEL SERVICIO', 'DIRECCION'] },
  { clave: 'ppto', etiquetas: ['PPTO. PRE.', 'PPTO PRE', 'PPTO', 'PRESUPUESTO'] },
  { clave: 'tipo', etiquetas: ['TIPO ORDEN TRABAJO', 'TIPO DE ORDEN TRABAJO', 'TIPO OT', 'TIPO'] },
]

export const normalizar = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()

// "1.234,56" / "1,234.56" / "450" → número (o null si no es un monto válido).
export function parsearMonto(texto) {
  const limpio = String(texto ?? '').replace(/[^\d.,-]/g, '')
  if (!limpio) return null
  let normalizado = limpio
  if (limpio.includes(',') && limpio.includes('.')) {
    normalizado =
      limpio.lastIndexOf(',') > limpio.lastIndexOf('.')
        ? limpio.replace(/\./g, '').replace(',', '.')
        : limpio.replace(/,/g, '')
  } else if (limpio.includes(',')) {
    normalizado = limpio.replace(',', '.')
  }
  const numero = Number(normalizado)
  return Number.isFinite(numero) ? numero : null
}

// Busca la fila de encabezado y resuelve el índice de cada columna por nombre.
export function buscarEncabezado(rows) {
  const limite = Math.min(rows.length, 50)
  for (let i = 0; i < limite; i++) {
    const fila = rows[i]
    if (!Array.isArray(fila)) continue
    const cols = {}
    fila.forEach((celda, indice) => {
      const texto = normalizar(celda)
      if (!texto) return
      for (const campo of CAMPOS) {
        if (cols[campo.clave] !== undefined) continue
        if (campo.etiquetas.some((etiqueta) => texto === etiqueta || texto.startsWith(etiqueta))) {
          cols[campo.clave] = indice
          break
        }
      }
    })
    const completo =
      cols.nro !== undefined && cols.codigo !== undefined && cols.cliente !== undefined &&
      cols.tipo !== undefined
    if (completo) return { headerIdx: i, cols }
  }
  return null
}

// Recorre las hojas del libro y devuelve la primera con encabezado reconocible.
export function buscarHoja(workbook) {
  for (const nombre of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[nombre], { header: 1 })
    const encabezado = buscarEncabezado(rows)
    if (encabezado) return { hoja: nombre, rows, ...encabezado }
  }
  return null
}

export function leerLibro(data) {
  return XLSX.read(data, { type: 'array' })
}

/**
 * Convierte las filas del Excel en filas de importación.
 * Cada fila queda en estado 'ok' (se importa), 'error' (datos inválidos o
 * duplicada en el archivo) u 'omitido' (tipo fuera del catálogo).
 */
export function parsearFilas(rows, inicio, cols, tipos, categoriaReubicacion = 'Monofásica') {
  const valor = (fila, clave) =>
    cols[clave] === undefined ? '' : String(fila[cols[clave]] ?? '').trim()

  const tipoPorNombre = new Map(tipos.map((t) => [normalizar(t.nombre), t]))
  const vistas = new Map()
  const filas = []

  for (let i = inicio; i < rows.length; i++) {
    const fila = rows[i]
    if (!Array.isArray(fila)) continue

    const nro = valor(fila, 'nro')
    const codigo = valor(fila, 'codigo')
    const cliente = valor(fila, 'cliente')
    const direccion = valor(fila, 'direccion')
    const pptoTexto = valor(fila, 'ppto')
    const tipoTexto = valor(fila, 'tipo')

    // Filas de relleno, encabezados repetidos, totales y firmas.
    if (!nro && !codigo && !cliente && !direccion && !pptoTexto && !tipoTexto) continue
    if (normalizar(nro) === 'NRO.' || normalizar(nro) === 'NRO') continue
    if (/sello/i.test(cliente) || /sello/i.test(nro)) continue
    if (/^total/i.test(nro) || /^total/i.test(cliente)) continue
    // Lo que no empieza con número no es una OT (notas, subtítulos, firmas).
    if (!/^\d+$/.test(nro)) continue

    const tipoExcel = normalizar(tipoTexto)
    let tipoNombre = null
    let estado = 'ok'
    let mensaje = ''

    if (tipoExcel.includes('SERVICIO EXTRAORDINARIO')) {
      estado = 'omitido'
      mensaje = 'Tipo no disponible en catálogo'
    } else if (tipoExcel.includes('REUBICACION')) {
      tipoNombre = 'Reubicación'
    } else if (tipoExcel.includes('INSTALACION')) {
      tipoNombre = 'Instalación nueva'
    } else if (tipoPorNombre.has(tipoExcel)) {
      tipoNombre = tipoPorNombre.get(tipoExcel).nombre
    } else if (tipoTexto) {
      estado = 'error'
      mensaje = `Tipo de OT no reconocido: "${tipoTexto}"`
    } else {
      estado = 'error'
      mensaje = 'Falta Tipo Orden Trabajo'
    }

    // Si el tipo no existe en el catálogo del backend no se puede importar.
    if (estado === 'ok' && !tipoPorNombre.get(normalizar(tipoNombre))) {
      estado = 'omitido'
      mensaje = `El tipo "${tipoNombre}" no está en el catálogo`
    }

    // Número de OT: últimos 6 dígitos del Código Orden Trabajo.
    const digitos = codigo.replace(/\D/g, '')
    let numeroOT = null
    if (!digitos) {
      if (estado === 'ok') {
        estado = 'error'
        mensaje = 'Código Orden Trabajo inválido (sin números)'
      }
    } else {
      numeroOT = Number(digitos.slice(-6))
      if ((!Number.isInteger(numeroOT) || numeroOT <= 0) && estado === 'ok') {
        estado = 'error'
        mensaje = 'Código Orden Trabajo inválido'
      }
    }

    const esReubicacion = tipoNombre === 'Reubicación'
    const ppto = parsearMonto(pptoTexto)
    let categoria = null

    if (estado === 'ok') {
      if (!cliente) {
        estado = 'error'
        mensaje = 'Falta Nombre del cliente'
      } else if (esReubicacion) {
        // Las reubicaciones se eligen una por una en la vista previa: arrancan
        // con la categoría por defecto del catálogo.
        categoria = categoriaReubicacion
      } else if (ppto === null) {
        estado = 'error'
        mensaje = 'Falta Ppto. Pre.'
      } else {
        categoria = ppto > UMBRAL_TRIFASICA ? 'Trifásica' : 'Monofásica'
      }
    }

    // Duplicados dentro del mismo archivo (la clave real es tipo + número).
    if (estado === 'ok') {
      const clave = `${normalizar(tipoNombre)}|${numeroOT}`
      if (vistas.has(clave)) {
        estado = 'error'
        mensaje = `Número de OT repetido en el archivo (fila ${vistas.get(clave)})`
      } else {
        vistas.set(clave, i + 1)
      }
    }

    filas.push({
      filaExcel: i + 1,
      numeroOT,
      codigo,
      cliente: cliente || 'Sin nombre',
      descripcion: direccion,
      ppto,
      tipoNombre: tipoNombre || '—',
      esReubicacion,
      categoria,
      estado,
      mensaje,
    })
  }

  return filas
}
