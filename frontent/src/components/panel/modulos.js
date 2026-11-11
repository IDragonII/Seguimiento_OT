import {
  BarChart3,
  BellRing,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Files,
  History,
  ListChecks,
  PackageCheck,
  Radar,
  Truck,
  Undo2,
} from 'lucide-react'

export const BASE_PANEL = '/panel'

export const MODULOS = [
  // TÉCNICO
  {
    key: 'mis-ordenes',
    nombre: 'Centro de trabajo',
    descripcion: 'Gestiona tus órdenes asignadas y controla tus actividades',
    icono: Briefcase,
  },
  {
    key: 'mis-devoluciones',
    nombre: 'Mis devoluciones',
    descripcion: 'Tus devoluciones registradas',
    icono: Undo2,
  },
  {
    key: 'mi-historial',
    nombre: 'Mi historial',
    descripcion: 'Movimientos de tus órdenes',
    icono: ListChecks,
  },
  // CONSULTOR + FACTIBILIZADOR
  {
    key: 'ordenes-trabajo',
    nombre: 'Órdenes de trabajo',
    descripcion: 'Consulta y seguimiento de OT',
    icono: Files,
  },
  {
    key: 'programaciones',
    nombre: 'Programaciones',
    descripcion: 'Planificación de entregas',
    icono: CalendarDays,
  },
  {
    key: 'entregas',
    nombre: 'Entregas',
    descripcion: 'Entrega de OT a técnicos',
    icono: Truck,
  },
  {
    key: 'devoluciones',
    nombre: 'Devoluciones',
    descripcion: 'Devoluciones y recepción de OT',
    icono: PackageCheck,
  },
  {
    key: 'seguimiento',
    nombre: 'Seguimiento',
    descripcion: 'Estado de las OT en curso',
    icono: Radar,
  },
  {
    key: 'historial',
    nombre: 'Historial',
    descripcion: 'Movimientos del sistema',
    icono: History,
  },
  {
    key: 'reportes',
    nombre: 'Reportes',
    descripcion: 'Informes y exportaciones',
    icono: BarChart3,
  },
  // FACTIBILIZADOR
  {
    key: 'revision',
    nombre: 'Revisión de órdenes',
    descripcion: 'Revisar y cerrar OT',
    icono: ClipboardCheck,
  },
  {
    key: 'alertas',
    nombre: 'Alertas',
    descripcion: 'Alertas de vencimiento',
    icono: BellRing,
  },
]

export function rutaModulo(key) {
  return `${BASE_PANEL}/${key}`
}

export function moduloPorRuta(ruta) {
  return MODULOS.find((m) => rutaModulo(m.key) === ruta)
}
