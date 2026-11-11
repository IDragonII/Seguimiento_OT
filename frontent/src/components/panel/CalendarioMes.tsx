import type { CSSProperties } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { claveFecha, coloresDe, type BaseChip } from './estadosOT'

interface Celda<T> {
  clave: string
  fecha: Date
  enMes: boolean
  finde: boolean
  esHoy: boolean
  items: T[]
}

interface Props<T> {
  anio: number
  mes: number
  hoy: Date
  datos: Record<string, T[]>
  tituloMes: string
  onAnterior: () => void
  onSiguiente: () => void
  onHoy: () => void
  onSeleccionar: (item: T) => void
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const CLASE_BTN_NAV =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E8EE] bg-white text-[#3478C7] transition hover:bg-[#EDF4FC] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40'

export default function CalendarioMes<T extends BaseChip>({
  anio,
  mes,
  hoy,
  datos,
  tituloMes,
  onAnterior,
  onSiguiente,
  onHoy,
  onSeleccionar,
}: Props<T>) {
  const primerDia = new Date(anio, mes, 1)
  const offset = (primerDia.getDay() + 6) % 7
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const totalCeldas = Math.ceil((offset + diasEnMes) / 7) * 7

  const celdas: Celda<T>[] = Array.from({ length: totalCeldas }, (_, i) => {
    const fecha = new Date(anio, mes, 1 - offset + i)
    const clave = claveFecha(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
    return {
      clave,
      fecha,
      enMes: fecha.getMonth() === mes,
      finde: fecha.getDay() === 0 || fecha.getDay() === 6,
      esHoy:
        fecha.getFullYear() === hoy.getFullYear() &&
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getDate() === hoy.getDate(),
      items: datos[clave] ?? [],
    }
  })

  return (
    <div
      data-calendario="mes"
      className="overflow-hidden rounded-xl border border-[#E4E8EE] bg-white shadow-[0_4px_18px_rgba(24,40,62,0.07)]"
    >
      {/* Barra de navegación del mes */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E8EE] bg-white px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-mes-ant
            aria-label="Mes anterior"
            className={CLASE_BTN_NAV}
            onClick={onAnterior}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <h2
            data-titulo-mes
            className="px-3 text-center text-base font-semibold capitalize text-[#18283E]"
          >
            {tituloMes}
          </h2>
          <button
            type="button"
            data-mes-sig
            aria-label="Mes siguiente"
            className={CLASE_BTN_NAV}
            onClick={onSiguiente}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          data-mes-hoy
          onClick={onHoy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#3478C7] bg-white px-3 py-1.5 text-xs font-semibold text-[#3478C7] transition hover:bg-[#EDF4FC] focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40"
        >
          <CalendarDays size={14} aria-hidden="true" />
          Hoy
        </button>
      </div>

      {/* Cabecera de días */}
      <div className="grid grid-cols-7 border-b border-[#E4E8EE] bg-[#F4F6F9]">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[#718096]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cuadrícula */}
      <div className="grid grid-cols-7">
        {celdas.map((c) => {
          const estilo: CSSProperties | undefined = c.esHoy
            ? { boxShadow: 'inset 0 0 0 2px #3478C7' }
            : undefined
          const fondo = !c.enMes
            ? 'bg-[#F1F3F6]'
            : c.finde
              ? c.fecha.getDay() === 6
                ? 'bg-[#F5F8FC]'
                : 'bg-[#FBF7F6]'
              : 'bg-white'
          const hover = c.enMes ? 'transition-colors hover:bg-[#F0F5FB]' : ''
          return (
            <div
              key={c.clave}
              data-fecha={c.clave}
              className={`min-h-[104px] border-b border-r border-[#E4E8EE] p-1.5 sm:min-h-[120px] xl:min-h-[140px] ${fondo} ${hover}`}
              style={estilo}
            >
              <div className="mb-1.5 flex h-6 items-center justify-start">
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] ${
                    c.esHoy
                      ? 'bg-[#3478C7] font-semibold text-white'
                      : c.enMes
                        ? 'font-medium text-[#55657A]'
                        : 'text-[#A0AEC0]'
                  }`}
                >
                  {c.fecha.getDate()}
                </span>
              </div>
              <div className="flex max-h-[86px] flex-col gap-1 overflow-y-auto xl:max-h-[104px]">
                {c.items.map((it, idx) => {
                  const col = coloresDe(it.estado)
                  return (
                    <button
                      key={`${c.clave}-${idx}`}
                      type="button"
                      data-chip-ot={it.numeroOT}
                      data-estado={it.estado}
                      title={`OT #${it.numeroOT} — ${it.estado}`}
                      onClick={() => onSeleccionar(it)}
                      className="w-full truncate rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#3478C7]/40"
                      style={{
                        borderLeftColor: col.borde,
                        backgroundColor: col.fondo,
                        color: col.texto,
                      }}
                    >
                      #{it.numeroOT}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
