# AGENTS.md — Proyecto Gestión de Órdenes de Trabajo

## Reglas de diseño (OBLIGATORIO)

- **Siempre usar ventanas flotantes modales** para mostrar detalles, historiales
  y **formularios** (crear/editar OT, programaciones, entregas, usuarios,
  devoluciones, confirmaciones, etc.).
- **Nunca mostrar detalles ni formularios "inline" en la misma vista** (ni
  tarjetas que se abajo de la lista, ni paneles pegados a la tabla).
- El contenido principal de una vista es la lista/tabla + **botones de acción**
  (ej. "Nueva OT", "Nueva entrega", "Nuevo usuario") que **abren el modal**;
  todo lo demás se ve en el modal flotante con overlay, botón de cierre y
  cierre con tecla ESC.
- Componente modal reutilizable: `frontent/src/components/Modal.jsx`.
- Aplica a todas las páginas del frontend (existentes y futuras).

## Estructura

- `SPEC.md` — especificación funcional completa del sistema.
- `db.sql` — esquema de base de datos de referencia.
- `backend/` — API Spring Boot 3.2 + PostgreSQL (Docker: `docker-compose up -d --build`).
- `frontent/` — frontend React + Vite (dev: `npm run dev`, proxy `/api` → `:8080`).

## Comandos

- Backend compilar: `cd backend && .\mvnw.cmd compile`
- Backend Docker: `cd backend && docker-compose up -d --build`
- Frontend lint: `cd frontent && npm run lint`
- Frontend build: `cd frontent && npm run build`
- Frontend typecheck: `cd frontent && npm run typecheck`

## Gotchas

- En `frontent/src/index.css` el reset `* { margin:0; padding:0 }` **debe
  quedar dentro de `@layer base`**: fuera de capa vence a las utilities de
  Tailwind (`@layer utilities`) y anula todo su padding.

## Credenciales de prueba

- Admin (app admin): `admin@ot.local` / `Admin123*`
  - **Primer ingreso obligatorio**: `Admin123*` es la contraseña de semilla
    (hardcodeada en `com.ot.config.CredencialesSemilla`). Al primer login el
    sistema **exige cambiar nombre, email y contraseña**: modal forzado
    (`frontent/src/components/CambioCredencialesModal.jsx`, sin ×/ESC/cierre
    por overlay — prop `forzado` de `Modal.jsx`) y `403` con
    `codigo: CAMBIO_CREDENCIALES_REQUERIDO` en toda la API hasta completar el
    cambio (`PUT /api/auth/cambio-inicial`, interceptor
    `CambioCredencialesInterceptor`). La detección es "la contraseña sigue
    siendo la semilla" (`passwordEncoder.matches`) — sin columna nueva, vale
    para todas las DBs.
  - El E2E prueba el flujo completo en **cada** corrida y **restaura
    `Admin123*` al terminar** (vía `PUT /api/usuarios/{id}`) para que siempre
    arranque en primer ingreso; el password que usa durante la corrida es
    `Admin123*E2E`. Si cambias la contraseña a mano y el E2E no puede
    autenticar al admin, restaura la semilla con:
    `UPDATE usuarios SET password_hash = '$2a$10$cYaQFTa/d2ex1/h.yipICeW.mRfQZmGns7ho0ZMn7eYT//PVdEDnq' WHERE email = 'admin@ot.local';`
    (hash bcrypt de `Admin123*`).
- Técnico (panel): `tecnico@ot.local` / `Tecnico123*`
- Técnico (panel): `maria@ot.local` / `Tecnico123*`
- Factibilidad (panel): `factibilidad@ot.local` / `Factibilidad123*`
- Consultor (panel): `consultor@ot.local` / `Consultor123*`

## Panel de trabajo (roles no admin)

- El login bifurca por rol: ADMIN → `/` (app existente, intacta);
  TECNICO/CONSULTOR/FACTIBILIZADOR → `/panel`.
- Los módulos los sirve el backend (`modulos[]` en `POST /api/auth/login` y
  `GET /api/auth/me`); catálogo en `frontent/src/components/panel/modulos.js`.
- Al presionar un módulo por ahora solo se muestra el anuncio
  "Presionaste este módulo" (`ModuloProximamente.jsx`); los módulos se
  construirán después, uno a uno.
- **Módulo `mis-ordenes` ya está construido** (sigue la regla de modales):
  `frontent/src/pages/CentroTrabajo.tsx` — **Centro de trabajo del Técnico**
  (bandeja + indicadores + categorías + expediente en `Modal`), TSX + Tailwind:
  tira de 3 indicadores (total / en poder / devoluciones solicitadas); tabs
  `En mi poder` → `Devoluciones solicitadas` → `Historial` (clasificación por
  `recibidoPor` → `fechaDevolucion` → en poder; sin categoría "pendientes de
  entrega"); toolbar (buscador Nº OT, tipo, estado, rango de fechas, orden,
  vista lista/fichas); expediente en `Modal` flotante con banda tipo+estado,
  datos operativos, timeline de movimientos y acciones por estado; solicitud de
  devolución en `Modal` de formulario (dos modales nunca apilados: el formulario
  reemplaza al expediente). `GET /api/entregas/mis-ot` devuelve además
  `recibidoPor` (Usuario) para clasificar. En `App.jsx` sale de `RUTAS_MODULO`
  y tiene ruta propia `/panel/mis-ordenes`. `components/panel/CalendarioMes.tsx`
  y `estadosOT.ts` quedan **sin uso** en este módulo (reservados para
  Factibilizador); `MisOrdenes.tsx` fue eliminado.
- **No son módulos**: notificaciones y perfil. La **campanita** del header
  abre un dropdown con las alertas (detalle en `Modal`); el **avatar** abre
  un menú con "Mi perfil" (Modal con tarjeta de datos) y "Cerrar sesión"
  (Modal de confirmación). Componente compartido: `ControlesPanel.jsx`
  (está también en la barra de los módulos).
- Menú radial del FAB: `RadialMenu.tsx` (TypeScript + Tailwind v4 **sin
  preflight**; utilities en `styles/tailwind.css`).
- Estilos del panel: `frontent/src/styles/panel.css` (paleta y grid auto-fit).
