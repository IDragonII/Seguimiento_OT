export interface ColoresEstado {
  texto: string
  fondo: string
  borde: string
}

export const COLORES_ESTADO: Record<string, ColoresEstado> = {
  PROGRAMADO: { texto: '#2C5FA3', fondo: '#E7F0FB', borde: '#3478C7' },
  ENTREGADO: { texto: '#1E6E52', fondo: '#E3F4EE', borde: '#27976B' },
  DEVUELTO: { texto: '#9A5B0B', fondo: '#FDF1E4', borde: '#D97706' },
  CERRADO: { texto: '#55657A', fondo: '#EDF0F4', borde: '#718096' },
}

export const ESTADOS_OT = ['PROGRAMADO', 'ENTREGADO', 'DEVUELTO', 'CERRADO'] as const

export function coloresDe(estado?: string): ColoresEstado {
  return COLORES_ESTADO[estado ?? ''] ?? { texto: '#55657A', fondo: '#EDF0F4', borde: '#718096' }
}

export function claveFecha(anio: number, mes: number, dia: number): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${anio}-${p(mes + 1)}-${p(dia)}`
}

export interface BaseChip {
  numeroOT: number
  estado: string
}
