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
- Si un componente nuevo no aplica sus utilities (layout roto), **reiniciar
  `npm run dev`**: el dev server de larga vida no rescaneó las clases de
  archivos creados después de arrancar (se detectó con `sm:grid` ausente en
  `EntregasPanel.tsx`).
- En Tailwind los valores arbitrarios de `grid-cols` van con **guiones
  bajos**, nunca comas: `grid-cols-[80px_1fr]` (con comas genera
  `grid-template-columns: 80px,1fr`, CSS inválido que se descarta y todo se
  apila en 1 columna).

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
- Al presionar un módulo sin vista propia se muestra el anuncio
  "Presionaste este módulo" (`ModuloProximamente.jsx`); los módulos restantes
  se construirán después, uno a uno. Los construidos se mapean en
  `VISTAS_MODULO` (`App.jsx`).
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
  y tiene ruta propia `/panel/mis-ordenes`. `MisOrdenes.tsx` fue eliminado
  (`CalendarioMes.tsx` y `estadosOT.ts` hoy los consume el módulo
  `entregas`).
- **Módulos `mis-devoluciones` y `mi-historial` construidos** (solo vista
  lista + detalle en `Modal`, sin formularios): `frontent/src/pages/
  MisDevoluciones.tsx` y `frontent/src/pages/MiHistorial.tsx` (TSX + Tailwind,
  patrón CentroTrabajo). **Mis devoluciones**: filtra `GET /api/entregas/mis-ot`
  por `fechaDevolucion != null`; indicadores total / pendientes (`recibidoPor`
  null) / recibidas; toolbar (buscador Nº OT, estado devolución, orden);
  modal solo lectura con datos de la devolución + timeline de la OT.
  **Mi historial**: `GET /api/ordenes-trabajo/mis-historial` (endpoint nuevo:
  movimientos de las OTs donde fui técnico, todos los actores,
  `ORDER BY fecha DESC` — no confundir con `findByUsuarioIdOrderByFechaDesc`);
  indicadores movimientos / OTs / últimos 7 días; toolbar (buscador Nº OT,
  acción, rango de fechas, orden); modal con datos del movimiento + ficha de
  la OT + timeline. Ambas vistas en `App.jsx` vía `VISTAS_MODULO`.
- **Módulo `entregas` construido** (FUSIÓN de `programaciones` + entregas;
  CONSULTOR y FACTIBILIZADOR): `frontent/src/pages/EntregasPanel.tsx`
  (TSX + Tailwind, en `VISTAS_MODULO`; `Programaciones.tsx` fue **eliminado**
  y la clave `programaciones` salió de `modulosPorRol` — CONSULTOR queda en
  **6** tarjetas y FACTIBILIZADOR en **8**). Dos vistas con toggle
  `data-vista` (Calendario | Entregas) en el toolbar: **Calendario** usa
  `components/panel/CalendarioMes.tsx` (chips OT → detalle de programación
  con pills por estado real + acciones Agregar OTs / Entregar / Reprogramar)
  y **Entregas** tiene subvistas lista/fichas (`data-subvista`), buscador,
  orden y contador. 3 indicadores `data-indicador` = ENTREGAS /
  PROGRAMADAS ("Pend. entregar" = OTs en estado `PROGRAMADO`) / PENDIENTES
  ("Sin recepción"). Siete modales locales con estado único `ModalState`
  (**nunca apilados**): DetalleProgramacion, NuevaProgramacion
  (`POST /api/programaciones`), Agregar (checklist
  `GET /api/ordenes-trabajo/disponibles` → `POST /{id}/ordenes`),
  Reprogramar (copia OTs pendientes a fecha nueva), NuevaEntrega (modo
  standalone con checklist de `disponibles` y modo "pre" desde el detalle de
  programación que precarga OTs `PROGRAMADO`; técnico general + individual
  por fila → `POST /api/entregas` → `{entrega.id}`), DetalleEntrega
  (`GET /api/entregas/{id}` → `{entrega, detalles}`) y Recepción (checkbox
  por OT recibible + ubicación → `POST /{id}/recepcion`). CONSULTOR 100%
  solo lectura (acciones gateadas por `puedeEditable`; el badge informativo
  "sin recepción" sí se muestra; verificado en E2E caso [3]). **Backend**:
  `@PreAuthorize("hasAnyRole('ADMIN','FACTIBILIZADOR')")` en `POST
  /api/entregas`, `POST /{id}/recepcion` y
  `POST /detalle/{id}/confirmar-recepcion` (`solicitar-devolucion` sigue sin
  restricción: valida identidad). El flag `entregada` de `detallesDe()` es
  siempre `false` (backend `setProgramacionDetalle(null)`); el frontend
  calcula pendientes por **estado de la OT**. API `/api/programaciones`
  intacta (alimenta calendario y seeds del E2E). E2E: casos [3] y [4] cubren
  el módulo; capturas con `fotos-entregas.cjs` (9 PNG).
- **Módulo `ordenes-trabajo` construido** (CONSULTOR + FACTIBILIZADOR,
  "Completo"): `frontent/src/pages/OrdenesTrabajoPanel.tsx` (TSX + Tailwind,
  en `VISTAS_MODULO`; nombre evita el choque con la página admin
  `OrdenesTrabajo.jsx`, intacta). Vista lista + vista fichas (toggle
  `data-vista`, patrón CentroTrabajo), 3 indicadores (total / programadas /
  entregadas), toolbar (buscador Nº/tipo/descripción, filtros tipo y estado,
  orden reciente/antigua/Nº, contador). Dos modales locales, **nunca
  apilados**: Detalle (banda tipo+estado, datos incl. **ubicación** SPEC §5.2,
  timeline `GET /{id}/historial`) y **Nueva OT** (`POST`, número manual único
  por tipo) — esta última **solo FACTIBILIZADOR** (`data-nueva-ot`); el
  CONSULTOR es 100% solo lectura (verificado en E2E). **Backend**:
  `@PreAuthorize("hasAnyRole('ADMIN','FACTIBILIZADOR')")` en `POST
  /api/ordenes-trabajo` (antes cualquier rol autenticado podía crear OT).
  E2E: casos [3] y [4] extienden el módulo; el caso [5] (móvil) clickea
  la tarjeta `devoluciones` (nth(2), placeholder) y verifica 8 círculos en
  el radial.
- **No son módulos**: notificaciones y perfil. La **campanita** del header
  abre un dropdown con las alertas (detalle en `Modal`); el **avatar** abre
  un menú con "Mi perfil" (Modal con tarjeta de datos) y "Cerrar sesión"
  (Modal de confirmación). Componente compartido: `ControlesPanel.jsx`
  (está también en la barra de los módulos).
- Menú radial del FAB: `RadialMenu.tsx` (TypeScript + Tailwind v4 **sin
  preflight**; utilities en `styles/tailwind.css`).
- Estilos del panel: `frontent/src/styles/panel.css` (paleta y grid auto-fit).
