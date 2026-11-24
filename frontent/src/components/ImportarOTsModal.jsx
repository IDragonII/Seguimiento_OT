import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react'
import Modal from '../components/Modal'
import { api } from '../api/api'
import {
  buscarHoja,
  leerLibro,
  normalizar,
  parsearFilas,
} from './importarOTsParse'

export default function ImportarOTsModal({ onCerrar }) {
  const [fase, setFase] = useState('subir')
  const [catalogos, setCatalogos] = useState(null)
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)
  const [filas, setFilas] = useState([])
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [errorGeneral, setErrorGeneral] = useState('')
  const [importando, setImportando] = useState(false)
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 })
  const [resumen, setResumen] = useState(null)
  const cancelarRef = useRef(false)
  const archivoRef = useRef(null)
  const [arrastrando, setArrastrando] = useState(false)

  async function cargarCatalogos() {
    try {
      const [tipos, categorias] = await Promise.all([api.get('/tipos-ot'), api.get('/categorias')])
      setCatalogos({ tipos, categorias })
      setErrorGeneral('')
    } catch (err) {
      setCatalogos(null)
      setErrorGeneral(err?.message || 'No se pudieron cargar los catálogos de tipos y categorías')
    } finally {
      setCargandoCatalogos(false)
    }
  }

  function reintentarCatalogos() {
    setCargandoCatalogos(true)
    setErrorGeneral('')
    cargarCatalogos()
  }

  useEffect(() => {
    cargarCatalogos()
  }, [])

  const categoriasDisponibles = useMemo(
    () => (catalogos?.categorias || []).map((c) => c.nombre),
    [catalogos]
  )

  const filasOk = filas.filter((f) => f.estado === 'ok')
  const filasError = filas.filter((f) => f.estado === 'error')
  const filasOmitidas = filas.filter((f) => f.estado === 'omitido')
  const hayReubicaciones = filasOk.some((f) => f.esReubicacion)

  // Categoría por defecto para reubicaciones: "Monofásica" si existe en el catálogo.
  function categoriaInicial() {
    const nombres = (catalogos?.categorias || []).map((c) => c.nombre)
    return nombres.includes('Monofásica') ? 'Monofásica' : (nombres[0] ?? 'Monofásica')
  }

  function cambiarCategoria(indice, nombre) {
    setFilas((previas) =>
      previas.map((fila, i) => (i === indice ? { ...fila, categoria: nombre } : fila))
    )
  }

  function handleSubir(evento) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (archivo) procesarArchivo(archivo)
  }

  function soltarArchivo(evento) {
    evento.preventDefault()
    setArrastrando(false)
    const archivo = evento.dataTransfer?.files?.[0]
    if (archivo) procesarArchivo(archivo)
  }

  function procesarArchivo(archivo) {
    if (!catalogos) {
      setErrorGeneral('Espera a que se carguen los catálogos antes de importar')
      return
    }
    if (!/\.(xlsx|xls)$/i.test(archivo.name)) {
      setErrorGeneral('El archivo debe ser Excel (.xlsx o .xls).')
      return
    }

    setErrorGeneral('')
    setNombreArchivo(archivo.name)
    setResumen(null)
    setProgreso({ hechos: 0, total: 0 })

    const reader = new FileReader()
    reader.onerror = () => {
      setErrorGeneral('No se pudo leer el archivo. Vuelve a intentarlo.')
    }
    reader.onload = (eventoLectura) => {
      try {
        const workbook = leerLibro(new Uint8Array(eventoLectura.target.result))
        const hoja = buscarHoja(workbook)
        if (!hoja) {
          setFilas([])
          setErrorGeneral(
            'No se encontró una hoja con el encabezado esperado (Nro., Código Orden Trabajo, Nombre, Tipo Orden Trabajo).'
          )
          return
        }

        const resultado = parsearFilas(
          hoja.rows,
          hoja.headerIdx + 1,
          hoja.cols,
          catalogos.tipos,
          categoriaInicial()
        )
        if (resultado.length === 0) {
          setFilas([])
          setErrorGeneral(
            `La hoja "${hoja.hoja}" tiene el encabezado pero ninguna fila con Nro. y datos de OT.`
          )
          return
        }

        setFilas(resultado)
        setFase('previsualizar')
      } catch (err) {
        setFilas([])
        setErrorGeneral(`No se pudo leer el Excel: ${err?.message || 'archivo inválido'}`)
      }
    }
    reader.readAsArrayBuffer(archivo)
  }

  async function handleImportar() {
    if (!catalogos) return

    const tiposPorNombre = new Map(catalogos.tipos.map((t) => [normalizar(t.nombre), t]))
    const categoriasPorNombre = new Map(catalogos.categorias.map((c) => [normalizar(c.nombre), c]))
    const aImportar = filas.filter((f) => f.estado === 'ok')

    cancelarRef.current = false
    setImportando(true)
    setErrorGeneral('')
    setProgreso({ hechos: 0, total: aImportar.length })

    const resultados = []
    for (const fila of aImportar) {
      if (cancelarRef.current) break

      const categoriaNombre = fila.categoria
      const tipo = tiposPorNombre.get(normalizar(fila.tipoNombre))
      const categoria = categoriasPorNombre.get(normalizar(categoriaNombre))

      try {
        if (!tipo) throw new Error(`Tipo "${fila.tipoNombre}" no encontrado en el catálogo`)
        if (!categoria) throw new Error(`Categoría "${categoriaNombre}" no encontrada`)

        await api.post('/ordenes-trabajo', {
          tipoOTId: tipo.id,
          numeroOT: fila.numeroOT,
          apellidosNombre: fila.cliente,
          descripcion: fila.descripcion,
          categoriaId: categoria.id,
        })
        resultados.push({ ok: true, fila })
      } catch (err) {
        const mensaje = err?.message || 'Error desconocido'
        const duplicado = err?.status === 400 && /ya existe/i.test(mensaje)
        resultados.push({ ok: false, fila, mensaje, duplicado })
      }

      setProgreso({ hechos: resultados.length, total: aImportar.length })
    }

    const creadas = resultados.filter((r) => r.ok).length
    const duplicados = resultados.filter((r) => !r.ok && r.duplicado).length
    const fallosApi = resultados.filter((r) => !r.ok && !r.duplicado)
    const erroresDatos = filas.filter((f) => f.estado === 'error').length

    setResumen({
      totalFilas: filas.length,
      enviadas: aImportar.length,
      procesadas: resultados.length,
      creadas,
      duplicados,
      omitidas: filasOmitidas.length,
      fallidas: erroresDatos + fallosApi.length,
      detalle: [
        ...filas
          .filter((f) => f.estado === 'error')
          .map((f) => ({ numeroOT: f.numeroOT, mensaje: f.mensaje })),
        ...fallosApi.map((r) => ({ numeroOT: r.fila.numeroOT, mensaje: r.mensaje })),
      ],
      cancelado: cancelarRef.current,
    })
    setImportando(false)
    setFase('resumen')
  }

  function volverASubir() {
    setFilas([])
    setNombreArchivo('')
    setErrorGeneral('')
    setFase('subir')
  }

  const bannerError = errorGeneral ? (
    <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {errorGeneral}
      {!catalogos && (
        <button type="button" onClick={reintentarCatalogos} className="ml-2 font-semibold underline">
          Reintentar
        </button>
      )}
    </div>
  ) : null

  if (fase === 'subir') {
    const deshabilitado = cargandoCatalogos || !catalogos
    return (
      <Modal titulo="Importar Órdenes de trabajo" onCerrar={onCerrar} ancho={760}>
        <div className="p-6 sm:p-8">
          <Pasos fase={fase} />
          {bannerError}

          <h3 className="text-lg font-semibold text-[#18283E]">Sube la planilla de órdenes</h3>
          <p className="mb-5 mt-1 text-sm text-[#55657A]">
            Arrastra el archivo Excel o elígelo desde tu equipo. Se lee en el navegador: no se
            importa nada hasta que confirmes la vista previa.
          </p>

          <label
            onDragOver={(e) => {
              e.preventDefault()
              if (!deshabilitado) setArrastrando(true)
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltarArchivo}
            className={[
              'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition',
              deshabilitado
                ? 'cursor-not-allowed border-[#E4E8EE] bg-[#FAFBFD] opacity-70'
                : arrastrando
                  ? 'cursor-pointer border-[#3478C7] bg-[#EDF4FC]'
                  : 'cursor-pointer border-[#D7DEE7] bg-[#FAFBFD] hover:border-[#3478C7] hover:bg-[#F4F8FE]',
            ].join(' ')}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full border border-[#E4E8EE] bg-white text-[#3478C7] shadow-sm">
              {cargandoCatalogos ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <Upload size={22} />
              )}
            </span>
            <span className="mt-3 text-sm font-semibold text-[#18283E]">
              {arrastrando
                ? 'Suelta el archivo para revisarlo'
                : 'Arrastra el Excel aquí o elige un archivo'}
            </span>
            <span className="mt-1 text-xs text-[#718096]">
              Formatos .xlsx y .xls · una planilla por importación
            </span>
            <span
              className={[
                'mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white',
                deshabilitado ? 'bg-[#9AA8B8]' : 'bg-[#3478C7]',
              ].join(' ')}
            >
              <FileSpreadsheet size={16} />
              {cargandoCatalogos ? 'Cargando catálogos…' : 'Seleccionar archivo'}
            </span>
            <input
              ref={archivoRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleSubir}
              disabled={deshabilitado}
              className="sr-only"
              aria-label="Archivo Excel de órdenes de trabajo"
            />
          </label>

          {nombreArchivo && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#F4F6F9] px-3 py-1 text-xs text-[#55657A]">
              <FileSpreadsheet size={13} /> Último archivo: {nombreArchivo}
            </p>
          )}

          <div className="mt-5 flex gap-3 rounded-xl border border-[#E4E8EE] bg-[#F7F9FC] p-4">
            <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-[#718096]" />
            <div className="text-xs leading-relaxed text-[#55657A]">
              <p className="mb-1 font-semibold text-[#18283E]">Columnas que se leen</p>
              <p className="font-mono text-[11px] text-[#718096]">
                Nro. · Código Orden Trabajo · Nombre · Dirección · Ppto. Pre. · Tipo Orden Trabajo
              </p>
              <p className="mt-1">
                Se reconocen por nombre y en cualquier orden; las filas de títulos, totales y firmas
                se ignoran.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  if (fase === 'previsualizar') {
    return (
      <Modal titulo="Vista previa de importación" onCerrar={onCerrar} ancho={1040}>
        <div className="p-6">
          <Pasos fase={fase} />
          {bannerError}

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#18283E]">Revisa antes de importar</h3>
              <p className="mt-0.5 text-xs text-[#718096]">
                {nombreArchivo ? `${nombreArchivo} · ` : ''}
                {hayReubicaciones
                  ? 'Cada reubicación tiene su propia categoría: cámbiala en la tabla.'
                  : 'La categoría depende del Ppto. Pre. (más de 600 = trifásica).'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[#E4E8EE] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#55657A]">
                {filas.length} filas
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E7F5EF] px-2.5 py-1 text-[11px] font-semibold text-[#1E7A55]">
                <Check size={12} /> {filasOk.length} listas
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FDECEC] px-2.5 py-1 text-[11px] font-semibold text-[#C0392B]">
                <AlertCircle size={12} /> {filasError.length} con error
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-semibold text-[#64748B]">
                <XCircle size={12} /> {filasOmitidas.length} omitidas
              </span>
            </div>
          </div>

          <div className="max-h-[52vh] overflow-auto rounded-xl border border-[#E4E8EE]">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Tipo', 'Nº OT', 'Cliente', 'Dirección', 'Ppto.', 'Categoría', 'Estado'].map((col) => (
                    <th
                      key={col}
                      className="sticky top-0 z-10 whitespace-nowrap border-b border-[#E4E8EE] bg-[#F7F9FC] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#718096]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-[#EEF2F6] last:border-0 even:bg-[#FAFBFD]">
                    <td className="px-3 py-2 text-[#18283E]">{f.tipoNombre}</td>
                    <td className="px-3 py-2 font-semibold tabular-nums text-[#18283E]">
                      {f.numeroOT ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[#55657A]">{f.cliente || '—'}</td>
                    <td
                      className="max-w-[220px] truncate px-3 py-2 text-[#55657A]"
                      title={f.descripcion || ''}
                    >
                      {f.descripcion || '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#55657A]">
                      {f.ppto !== null ? f.ppto.toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {f.estado !== 'ok' ? (
                        <span className="text-[#B0BAC7]">—</span>
                      ) : f.esReubicacion ? (
                        <select
                          value={f.categoria}
                          onChange={(e) => cambiarCategoria(i, e.target.value)}
                          disabled={importando}
                          className="rounded-md border border-[#E4E8EE] bg-white px-1.5 py-1 text-xs font-medium text-[#18283E] disabled:opacity-50"
                          aria-label={`Categoría de la reubicación ${f.numeroOT ?? ''}`}
                        >
                          {categoriasDisponibles.map((nombre) => (
                            <option key={nombre} value={nombre}>
                              {nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[#55657A]">{f.categoria}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <ChipEstado fila={f} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importando && (
            <div className="mt-4" role="status">
              <div className="mb-1.5 flex items-center justify-between text-xs text-[#55657A]">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Importando…
                </span>
                <span className="tabular-nums">
                  {progreso.hechos} / {progreso.total}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E4E8EE]">
                <div
                  className="h-full rounded-full bg-[#3478C7] transition-all"
                  style={{
                    width: `${progreso.total ? (progreso.hechos / progreso.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E8EE] pt-4">
            <button
              type="button"
              onClick={volverASubir}
              disabled={importando}
              className="btn btn-secundario"
            >
              <span className="inline-flex items-center gap-2">
                <ArrowLeft size={15} /> Volver
              </span>
            </button>
            {importando ? (
              <button
                type="button"
                onClick={() => {
                  cancelarRef.current = true
                }}
                className="btn btn-secundario"
              >
                <span className="inline-flex items-center gap-2">
                  <XCircle size={15} /> Cancelar
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleImportar}
                disabled={filasOk.length === 0 || !catalogos}
                className="btn"
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={15} /> Importar {filasOk.length}{' '}
                  {filasOk.length === 1 ? 'OT' : 'OTs'}
                </span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    )
  }

  if (fase === 'resumen') {
    const tarjetas = [
      {
        etiqueta: 'Creadas',
        valor: resumen?.creadas ?? 0,
        clase: 'text-[#27976B]',
        fondo: 'bg-[#E7F5EF]',
        icono: CheckCircle2,
      },
      {
        etiqueta: 'Fallidas',
        valor: resumen?.fallidas ?? 0,
        clase: 'text-[#C0392B]',
        fondo: 'bg-[#FDECEC]',
        icono: AlertCircle,
      },
      {
        etiqueta: 'Duplicadas',
        valor: resumen?.duplicados ?? 0,
        clase: 'text-[#B4690E]',
        fondo: 'bg-[#FDF3E3]',
        icono: FileSpreadsheet,
      },
      {
        etiqueta: 'Omitidas',
        valor: resumen?.omitidas ?? 0,
        clase: 'text-[#64748B]',
        fondo: 'bg-[#F1F5F9]',
        icono: XCircle,
      },
    ]

    return (
      <Modal titulo="Importación completada" onCerrar={onCerrar} ancho={760}>
        <div className="p-6">
          <Pasos fase={fase} />

          {resumen?.cancelado && (
            <div className="mb-4 rounded-lg border border-[#F1DDB4] bg-[#FDF7EA] p-3 text-sm text-[#8A5B12]">
              Importación cancelada: se procesaron {resumen.procesadas} de {resumen.enviadas} filas
              enviadas.
            </div>
          )}

          <h3 className="text-lg font-semibold text-[#18283E]">
            {resumen?.creadas
              ? `${resumen.creadas} ${resumen.creadas === 1 ? 'OT creada' : 'OTs creadas'}`
              : 'No se creó ninguna OT'}
          </h3>
          <p className="mb-4 mt-1 text-xs text-[#718096]">
            Se procesaron {resumen?.totalFilas ?? 0} filas del archivo.
          </p>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tarjetas.map(({ etiqueta, valor, clase, fondo, icono: Icono }) => (
              <div key={etiqueta} className="rounded-xl border border-[#E4E8EE] bg-white p-3">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${fondo} ${clase}`}>
                  <Icono size={16} />
                </span>
                <p className={`mt-2 text-2xl font-bold tabular-nums ${clase}`}>{valor}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#718096]">
                  {etiqueta}
                </p>
              </div>
            ))}
          </div>

          {resumen?.detalle?.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold text-[#18283E]">Filas con problemas</p>
              <ul className="max-h-[28vh] divide-y divide-[#F0F3F7] overflow-auto rounded-xl border border-[#E4E8EE]">
                {resumen.detalle.map((d, i) => (
                  <li key={i} className="flex gap-2 px-3 py-2 text-xs text-[#55657A]">
                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-[#C0392B]" />
                    <span>
                      <span className="font-semibold text-[#18283E]">
                        OT {d.numeroOT ?? '—'}
                      </span>{' '}
                      · {d.mensaje}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-[#E4E8EE] pt-4">
            <button
              type="button"
              onClick={volverASubir}
              className="btn btn-secundario"
            >
              <span className="inline-flex items-center gap-2">
                <Upload size={15} /> Importar otro archivo
              </span>
            </button>
            <button type="button" onClick={onCerrar} className="btn">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return null
}

const PASOS_IMPORTACION = [
  { clave: 'subir', etiqueta: 'Subir' },
  { clave: 'previsualizar', etiqueta: 'Revisar' },
  { clave: 'resumen', etiqueta: 'Resumen' },
]

function Pasos({ fase }) {
  const actual = PASOS_IMPORTACION.findIndex((p) => p.clave === fase)
  return (
    <ol className="mb-6 flex items-center gap-2">
      {PASOS_IMPORTACION.map((paso, i) => {
        const hecho = i < actual
        const activo = i === actual
        return (
          <li key={paso.clave} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={[
                'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                hecho
                  ? 'bg-[#27976B] text-white'
                  : activo
                    ? 'bg-[#3478C7] text-white'
                    : 'bg-[#E4E8EE] text-[#718096]',
              ].join(' ')}
            >
              {hecho ? <Check size={13} /> : i + 1}
            </span>
            <span
              className={[
                'text-[11px] font-semibold uppercase tracking-wide',
                activo ? 'text-[#18283E]' : 'text-[#9AA8B8]',
              ].join(' ')}
            >
              {paso.etiqueta}
            </span>
            {i < PASOS_IMPORTACION.length - 1 && (
              <span
                className={['h-px flex-1', hecho ? 'bg-[#BBDCCD]' : 'bg-[#E4E8EE]'].join(' ')}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function ChipEstado({ fila }) {
  if (fila.estado === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#E7F5EF] px-2 py-0.5 text-[11px] font-semibold text-[#1E7A55]">
        <Check size={12} /> Lista
      </span>
    )
  }
  if (fila.estado === 'omitido') {
    return (
      <span
        title={fila.mensaje}
        className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]"
      >
        <XCircle size={12} /> Omitida
      </span>
    )
  }
  return (
    <span
      title={fila.mensaje}
      className="inline-flex max-w-[230px] items-center gap-1 rounded-full bg-[#FDECEC] px-2 py-0.5 text-[11px] font-semibold text-[#C0392B]"
    >
      <AlertCircle size={12} className="shrink-0" />
      <span className="min-w-0 truncate">{fila.mensaje}</span>
    </span>
  )
}
