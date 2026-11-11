import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Menu, type LucideIcon } from 'lucide-react'

export type RadialItem = {
  key: string
  icon: LucideIcon
  nombre: string
}

type Punto = { x: number; y: number }

type Geo = {
  cx: number
  cy: number
  diam: number
  pos: Punto[]
}

type Props = {
  items: RadialItem[]
  onSelect: (key: string) => void
}

const MARGEN = 8
const START_DEG = 100
const END_DEG = 182
const R_MIN = 100
const STAGGER_ABRIR_MS = 55
const STAGGER_CERRAR_MS = 30

// Escalera de adaptación: si el radio necesario no cabe en pantalla,
// se reduce el diámetro de los círculos y se ensancha la ventana angular.
const CONFIGS = [
  { diam: 48, gap: 10, span: 90 },
  { diam: 44, gap: 9, span: 95 },
  { diam: 40, gap: 8, span: 100 },
]

function calcularGeo(n: number, fab: HTMLElement | null): Geo | null {
  if (!fab || n === 0) return null

  const rect = fab.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const W = window.innerWidth
  const H = window.innerHeight

  // Alcance máximo en las direcciones usadas (abajo e izquierda).
  const rFit = Math.max(60, Math.min(cx - MARGEN - 26, H - cy - MARGEN - 26))

  let cfg = CONFIGS[0]
  let rMin = R_MIN
  for (const c of CONFIGS) {
    const span = n > 1 ? Math.min(c.span, END_DEG - START_DEG) : 0
    const dtRad = n > 1 ? ((span / (n - 1)) * Math.PI) / 180 : 0
    const minDist = c.diam + c.gap
    rMin = dtRad > 0 ? minDist / (2 * Math.sin(dtRad / 2)) : R_MIN
    cfg = c
    if (rMin <= rFit) break
  }

  const rad = Math.min(Math.max(rMin, R_MIN), rFit)
  const span = n > 1 ? Math.min(cfg.span, END_DEG - START_DEG) : 0
  const dtDeg = n > 1 ? span / (n - 1) : 0

  const pos: Punto[] = []
  for (let i = 0; i < n; i++) {
    const theta = ((START_DEG + i * dtDeg) * Math.PI) / 180
    let dx = rad * Math.cos(theta)
    let dy = rad * Math.sin(theta)

    // Clamp final: la caja completa del círculo queda dentro del viewport.
    const half = cfg.diam / 2 + MARGEN
    dx = Math.min(Math.max(cx + dx, half), W - half) - cx
    dy = Math.min(Math.max(cy + dy, half), H - half) - cy

    pos.push({ x: Math.round(dx), y: Math.round(dy) })
  }

  return { cx: Math.round(cx), cy: Math.round(cy), diam: cfg.diam, pos }
}

export default function RadialMenu({ items, onSelect }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [geo, setGeo] = useState<Geo | null>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  const n = items.length

  useLayoutEffect(() => {
    setGeo(calcularGeo(n, fabRef.current))
  }, [abierto, n])

  useEffect(() => {
    function alRedimensionar() {
      setGeo(calcularGeo(n, fabRef.current))
    }
    window.addEventListener('resize', alRedimensionar)
    return () => window.removeEventListener('resize', alRedimensionar)
  }, [n])

  useEffect(() => {
    if (!abierto) return

    function alPresionar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    function alHacerClic(e: MouseEvent) {
      const destino = e.target as HTMLElement
      if (!destino.closest('.radial-item') && !destino.closest('.modulo-fab')) {
        setAbierto(false)
      }
    }

    document.addEventListener('keydown', alPresionar)
    document.addEventListener('mousedown', alHacerClic)
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.removeEventListener('mousedown', alHacerClic)
    }
  }, [abierto])

  function seleccionar(key: string) {
    setAbierto(false)
    onSelect(key)
  }

  const cx = geo?.cx ?? 0
  const cy = geo?.cy ?? 0
  const diam = geo?.diam ?? 48

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className="modulo-fab fixed top-[70px] right-[18px] z-50 grid h-12 w-12 place-items-center rounded-full border-none bg-[#3478C7] text-white shadow-[0_8px_24px_rgba(24,40,62,0.35)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#2b66ab] hover:shadow-[0_12px_28px_rgba(24,40,62,0.4)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18283E] aria-expanded:bg-[#18283E] max-sm:top-[66px] max-sm:right-[14px] max-sm:h-11 max-sm:w-11"
        aria-label="Módulos"
        aria-expanded={abierto}
        aria-controls="radial-menu-items"
        onClick={() => setAbierto((v) => !v)}
      >
        <Menu size={24} strokeWidth={2} aria-hidden="true" />
      </button>

      <div id="radial-menu-items" role="menu" aria-label="Módulos">
        {items.map((item, i) => {
          const Icono = item.icon
          const punto = geo?.pos[i]
          const x = abierto ? (punto?.x ?? 0) : 0
          const y = abierto ? (punto?.y ?? 0) : 0
          const delayMs = abierto
            ? i * STAGGER_ABRIR_MS
            : (n - 1 - i) * STAGGER_CERRAR_MS

          const style = {
            left: `${cx}px`,
            top: `${cy}px`,
            width: `${diam}px`,
            height: `${diam}px`,
            '--x': `${x}px`,
            '--y': `${y}px`,
            '--s': abierto ? '1' : '0.3',
            transitionDelay: `${delayMs}ms`,
            transform:
              'translate(-50%, -50%) translate(var(--x), var(--y)) scale(var(--s))',
          } as CSSProperties

          return (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={`radial-item fixed z-40 grid cursor-pointer place-items-center rounded-full border-2 border-white/70 bg-white p-0 text-[#18283E] shadow-[0_6px_18px_rgba(24,40,62,0.35)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#3478C7] hover:text-[#3478C7] hover:shadow-[0_10px_24px_rgba(52,120,199,0.40)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3478C7] ${
                abierto
                  ? 'pointer-events-auto opacity-100'
                  : 'pointer-events-none opacity-0'
              }`}
              style={style}
              title={item.nombre}
              aria-label={item.nombre}
              aria-hidden={!abierto}
              tabIndex={abierto ? 0 : -1}
              onClick={() => seleccionar(item.key)}
            >
              <Icono size={Math.round(diam * 0.5)} strokeWidth={1.7} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </>
  )
}
