# SPEC.md — Sistema de Gestión y Seguimiento de Órdenes de Trabajo

**Versión:** 2.0  
**Tipo:** Especificación funcional y técnica  
**Base de datos:** PostgreSQL  
**Frontend web:** React + Vite  
**Backend:** Django REST Framework o Spring Boot (pendiente de elección)  
**Aplicación móvil:** Flutter (fase futura)

---

## 1. Descripción del proyecto

Se desarrollará una aplicación web para gestionar y realizar el seguimiento integral de Órdenes de Trabajo (OT).

No se trata de un CRUD convencional. Es un sistema de gestión empresarial que debe permitir controlar el ciclo de vida de cada OT, gestionar programaciones, entregas, devoluciones, revisiones, reentregas, cierres, alertas y reportes.

El sistema tendrá una interfaz moderna, intuitiva y organizada por módulos.

Los usuarios accederán a las funcionalidades según sus roles y permisos.

### Objetivos principales

- Registrar órdenes de trabajo.
- Programar múltiples OT por fecha.
- Entregar órdenes a técnicos.
- Controlar entregas individuales.
- Registrar devoluciones parciales.
- Mantener el historial de cada OT.
- Permitir reprogramaciones.
- Controlar tiempos máximos por estado.
- Generar alertas automáticas.
- Consultar estadísticas y reportes.
- Mantener trazabilidad de todas las operaciones.

---

## 2. Arquitectura general

La arquitectura será desacoplada.

```text
                    APLICACIÓN WEB
                     React + Vite
                          |
             +------------+------------+
             |                         |
       PANEL ADMIN              APLICACIÓN OT
             |                         |
             +------------+------------+
                          |
                       API REST
                          |
                    BACKEND
               Django / Spring Boot
                          |
                      PostgreSQL


                  FUTURO MÓVIL
                      Flutter
                          |
                       API REST
```

La aplicación web y la futura aplicación móvil consumirán la misma API REST.

La lógica del negocio estará centralizada en el backend.

---

## 3. Tecnologías

| Componente | Tecnología |
|---|---|
| Frontend web | React + Vite |
| Lenguaje frontend | TypeScript (recomendado) |
| Estilos | Tailwind CSS |
| Componentes UI | shadcn/ui |
| Backend | Django REST Framework o Spring Boot |
| Lenguaje backend | Python o Java |
| Base de datos | PostgreSQL |
| Autenticación | JWT |
| Documentación API | Swagger / OpenAPI |
| Tareas programadas | Celery o alternativa equivalente |
| Cola de tareas | Redis, si se utiliza Celery |
| Aplicación móvil | Flutter (futuro) |

La elección entre Django y Spring Boot está pendiente.

> **IMPORTANTE:** El frontend no debe depender de características exclusivas de Django ni de Spring Boot.
>
> La comunicación será mediante API REST para permitir cambiar el framework backend sin reconstruir la aplicación web.

---

## 4. Organización de la aplicación web

La aplicación web será una única aplicación React + Vite.

Tendrá dos grandes áreas funcionales:

1. Panel de administración.
2. Aplicación operativa de gestión de OT.

No se desarrollarán aplicaciones diferentes para cada rol.

El usuario iniciará sesión y el sistema mostrará las funcionalidades que le correspondan.

### 4.1. Panel de administración

El panel de administración será desarrollado completamente en React.

No dependerá de Django Admin ni de herramientas administrativas externas.

Su objetivo es permitir que el administrador gestione y configure el sistema.

#### Módulos administrativos

**Dashboard administrativo**

- Resumen general del sistema.
- Cantidad de usuarios.
- Cantidad de OT.
- Órdenes por estado.
- Alertas pendientes.
- Actividad reciente.

**Gestión de usuarios**

- Registrar usuarios.
- Editar usuarios.
- Activar y desactivar usuarios.
- Asignar roles.
- Consultar información.
- Restablecer credenciales mediante un procedimiento seguro.

**Gestión de roles y permisos**

- Administrar roles.
- Configurar permisos.
- Controlar acceso a módulos.
- Definir permisos para operaciones específicas.

**Gestión de tipos de OT**

- Registrar tipos.
- Modificar tipos.
- Activar y desactivar tipos.

**Configuración de estados**

- Consultar estados.
- Administrar parámetros permitidos.
- Mantener las reglas de transición del negocio.

> Los estados fundamentales del sistema no podrán eliminarse arbitrariamente.

**Configuración de tiempos**

- Configurar tiempos máximos por estado.
- Consultar tiempos establecidos.
- Modificar límites.
- Marcar un estado como **sin tiempo límite** (activar/desactivar) sin eliminar su configuración.

**Calendario no laborable**

- Registrar feriados.
- Modificar feriados.
- Consultar calendario.
- Desactivar registros cuando corresponda.

**Gestión de alertas**

- Consultar alertas.
- Consultar destinatarios.
- Consultar estado de atención.
- Supervisar alertas pendientes.

**Auditoría**

- Consultar operaciones importantes.
- Identificar usuarios responsables.
- Consultar fechas y movimientos.

---

## 5. Aplicación operativa de gestión de OT

Esta será la interfaz principal de trabajo diario.

No debe parecer una tabla administrativa genérica.

Debe tener una experiencia de usuario similar a un software empresarial de gestión de operaciones.

### Módulos principales

- Dashboard operativo.
- Órdenes de trabajo.
- Programación.
- Entregas.
- Devoluciones y revisiones.
- Seguimiento.
- Historial.
- Alertas.
- Reportes.

La navegación y las acciones disponibles dependerán del rol.

### 5.1. Dashboard operativo

Debe presentar información relevante para el usuario.

Ejemplos:

- Total de OT.
- OT programadas.
- OT entregadas.
- OT pendientes de devolución.
- OT devueltas.
- OT cerradas.
- OT vencidas.
- Alertas pendientes.
- Actividad reciente.

El dashboard debe adaptar sus indicadores según el rol.

### 5.2. Órdenes de trabajo

Permite:

- Registrar nuevas OT.
- Consultar OT.
- Filtrar por tipo.
- Filtrar por número.
- Filtrar por estado.
- Consultar fechas.
- Consultar detalles.
- Consultar historial.
- Consultar la ubicación actual de la OT.

Cada OT tiene un campo `ubicacion` (no es un estado):

- Al registrar la OT: `Por entregar`.
- Al entregarla a un técnico: `Con técnico <nombre>`.
- Al confirmar la recepción: el administrador escribe la ubicación real de cada OT.

### 5.3. Programación

Permite:

- Crear programaciones por fecha.
- Agregar múltiples OT.
- Consultar programaciones anteriores.
- Consultar detalles.
- Controlar qué órdenes están pendientes de entrega.

### 5.4. Entregas

Permite:

- Seleccionar una programación.
- Seleccionar las OT que se entregarán.
- Seleccionar el técnico.
- Registrar la entrega.
- Guardar la fecha.
- Consultar entregas anteriores.

Inicialmente una entrega tendrá un solo técnico.

La estructura de datos permitirá evolucionar posteriormente a entregas con múltiples técnicos.

### 5.5. Devoluciones y revisiones

El técnico podrá registrar la devolución de sus órdenes.

El administrador o factibilizador podrá confirmar la recepción y realizar la revisión.

El sistema debe distinguir:

- Solicitud de devolución.
- Recepción administrativa.
- Revisión de la OT.

Una OT no se considerará administrativamente recibida hasta que se confirme su recepción.

Al confirmar la recepción, el administrador debe indicar la ubicación de cada OT recibida; la validación de este campo es responsabilidad del backend.

Las órdenes no devueltas permanecerán pendientes.

### 5.6. Seguimiento

Permitirá consultar la situación actual de cada OT.

Debe mostrar:

- Tipo y número de OT.
- Estado actual.
- Ubicación actual.
- Fecha de registro.
- Fecha de programación.
- Fecha de entrega.
- Técnico asignado.
- Fecha de devolución.
- Tiempo transcurrido.
- Alertas relacionadas.
- Historial completo.

### 5.7. Historial

Cada OT tendrá una línea de tiempo de movimientos.

Ejemplo:

```text
03/11/2026 - OT registrada.
03/11/2026 - OT programada.
03/11/2026 - OT entregada al técnico Juan.
04/11/2026 - Técnico solicita devolución.
04/11/2026 - Administración confirma recepción.
05/11/2026 - OT programada nuevamente.
06/11/2026 - OT entregada nuevamente.
07/11/2026 - OT devuelta.
08/11/2026 - OT cerrada.
```

Los movimientos anteriores no deberán sobrescribirse.

---

## 6. Roles del sistema

Existirán cuatro roles iniciales.

### ADMIN

Control total del sistema.

Puede:

- Gestionar usuarios.
- Gestionar roles y permisos.
- Registrar OT.
- Programar.
- Entregar.
- Confirmar devoluciones.
- Revisar.
- Reprogramar.
- Cerrar.
- Consultar historiales.
- Gestionar configuraciones.
- Consultar alertas y reportes.

### FACTIBILIZADOR

Puede:

- Registrar OT.
- Programar OT.
- Entregar OT.
- Recibir devoluciones.
- Revisar órdenes.
- Reprogramar.
- Cerrar órdenes, según los permisos asignados.
- Consultar seguimiento.
- Consultar alertas.

No puede administrar usuarios ni configuraciones generales.

### TECNICO

Puede:

- Consultar sus propias asignaciones.
- Consultar fechas de entrega.
- Consultar detalles de OT.
- Registrar solicitudes de devolución.
- Consultar sus devoluciones.
- Consultar su historial.

No puede consultar órdenes asignadas a otros técnicos.

### CONSULTOR

Tiene permisos de lectura.

Puede consultar información autorizada, historiales, seguimiento y reportes.

No puede realizar operaciones de modificación.

---

## 7. Registro de órdenes de trabajo

El número de OT será ingresado manualmente.

No es una clave foránea ni un identificador autogenerado.

Cada OT tendrá:

- ID interno.
- Tipo de OT.
- Número de OT.
- Estado.
- Descripción.
- Fecha de registro.
- Usuario que registra.

La identificación de negocio será la combinación **tipo + número**.

Ejemplo:

| ID | Tipo | Número |
|---|---|---|
| 1 | Instalación nueva | 001 |
| 2 | Reconexiones | 001 |
| 3 | Instalación nueva | 002 |

Se permite repetir el número entre diferentes tipos.

No se permite repetir el mismo número dentro del mismo tipo.

Restricción:

```sql
UNIQUE(tipo_ot_id, numero_ot)
```

---

## 8. Estados de las OT

Estados iniciales:

- PROGRAMADO.
- ENTREGADO.
- DEVUELTO.
- CERRADO.

### PROGRAMADO

La OT está programada y pendiente de entrega.

### ENTREGADO

La OT fue entregada al técnico.

### DEVUELTO

La OT fue devuelta por el técnico y está pendiente de recepción o revisión administrativa, según su etapa.

### CERRADO

La OT terminó definitivamente su ciclo.

Una OT cerrada no podrá volver a programarse.

Las transiciones serán validadas por el backend.

---

## 9. Programaciones

Una programación puede contener múltiples OT.

Ejemplo:

| OT | Tipo |
|---|---|
| 001 | Instalación nueva |
| 002 | Reconexiones |
| 003 | Instalación nueva |

Tablas:

- `programaciones`.
- `programacion_detalle`.

Una OT puede aparecer en programaciones diferentes a lo largo de su ciclo de vida.

No se permite duplicar una OT dentro de una misma programación.

---

## 10. Entregas

Una entrega tendrá una cabecera y varios detalles.

Ejemplo:

```text
Entrega #1
Fecha: 03/11/2026
Técnico: Juan

OT 001 - Instalación nueva
OT 002 - Reconexiones
OT 003 - Instalación nueva
```

Cada OT tendrá su propio registro individual de entrega.

Esto permite devolver algunas OT y mantener otras pendientes.

El técnico se registrará individualmente en cada detalle de entrega para facilitar futuras ampliaciones.

---

## 11. Devoluciones y reentregas

Las devoluciones se registrarán individualmente.

Ejemplo:

| OT | Entrega | Devolución |
|---|---|---|
| 001 | 03/11 | 04/11 |
| 002 | 03/11 | 04/11 |
| 003 | 03/11 | Pendiente |
| 004 | 03/11 | Pendiente |

La OT 001 puede volver a programarse y entregarse posteriormente.

Cada nuevo ciclo deberá crear nuevos registros.

No se deben sobrescribir fechas anteriores.

Una OT no puede tener dos entregas pendientes simultáneamente.

---

## 12. Historial

Se conservará el historial de todas las operaciones relevantes.

Se registrará:

- Usuario responsable.
- Acción.
- Estado anterior.
- Estado nuevo.
- Fecha.
- Programación relacionada.
- Entrega relacionada.
- Observación.

Las operaciones críticas deberán registrarse en transacciones.

---

## 13. Sistema de alertas

El sistema controlará los tiempos máximos por estado.

La configuración será independiente para cada estado.

Solo generan alertas de vencimiento los estados con tiempo límite **activo**; un estado marcado como «sin tiempo límite» no generará alertas aunque conserve su configuración.

Ejemplo ilustrativo:

| Estado | Máximo |
|---|---|
| PROGRAMADO | 2 días hábiles |
| ENTREGADO | 3 días hábiles |
| DEVUELTO | 1 día hábil |
| CERRADO | No aplica |

Los límites serán configurables desde el panel administrativo.

### Días hábiles

Se considerarán:

- Lunes a viernes: laborables.
- Sábados y domingos: no laborables.
- Feriados registrados: no laborables.

La tabla `calendario_no_laboral` almacenará los feriados.

El cálculo se realizará en el backend.

Debe definirse formalmente si el día de entrada al estado cuenta como primer día o si el conteo comienza el siguiente día hábil.

### Generación

Una tarea automática revisará periódicamente las OT.

El proceso:

1. Obtiene OT activas.
2. Consulta estado.
3. Consulta fecha de inicio del estado.
4. Obtiene límite configurado.
5. Calcula días hábiles.
6. Identifica vencimientos.
7. Genera alertas.
8. Registra destinatarios.

No se deben duplicar alertas para una misma transición de estado.

Las alertas se enviarán al administrador y al responsable correspondiente.

---

## 14. Seguridad

La autenticación utilizará JWT.

La API será responsable de:

- Validar identidad.
- Validar roles.
- Validar permisos.
- Restringir datos por usuario.
- Validar transiciones de estado.
- Evitar modificaciones no autorizadas.

Los secretos se almacenarán exclusivamente en variables de entorno del servidor.

Nunca se incluirán API Secrets privados en React ni en Flutter.

Se implementarán:

- HTTPS.
- Rate limiting.
- Validación de datos.
- Protección contra acceso no autorizado.
- Registro de operaciones críticas.

---

## 15. Base de datos

PostgreSQL será independiente del framework backend.

Tablas iniciales:

- `roles`.
- `usuarios`.
- `tipos_ot`.
- `estados_ot`.
- `ordenes_trabajo`.
- `programaciones`.
- `programacion_detalle`.
- `entregas`.
- `entrega_detalle`.
- `historial_ot`.
- `configuracion_tiempos_ot`.
- `calendario_no_laboral`.
- `alertas_ot`.
- `alertas_destinatarios`.

El archivo `database_v1.sql` contiene el esquema inicial y debe revisarse antes de implementar los modelos definitivos.

---

## 16. Organización sugerida del frontend

El frontend debe organizarse por módulos y funcionalidades.

Ejemplo:

```text
frontend/
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── layouts/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── navigation/
│   │   ├── tables/
│   │   └── feedback/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── usuarios/
│   │   ├── roles/
│   │   ├── ordenes-trabajo/
│   │   ├── programaciones/
│   │   ├── entregas/
│   │   ├── devoluciones/
│   │   ├── seguimiento/
│   │   ├── historial/
│   │   ├── alertas/
│   │   ├── reportes/
│   │   └── configuracion/
│   │
│   ├── services/
│   │   ├── api/
│   │   └── auth/
│   │
│   ├── hooks/
│   ├── types/
│   └── utils/
│
└── package.json
```

La estructura es orientativa y puede ajustarse al implementar.

---

## 17. Organización sugerida del backend

La organización debe ser modular y separar responsabilidades.

Módulos:

- autenticación.
- usuarios.
- roles y permisos.
- tipos_ot.
- estados_ot.
- ordenes_trabajo.
- programaciones.
- entregas.
- devoluciones.
- historial.
- alertas.
- configuracion.
- reportes.

No mezclar la lógica del negocio con los controladores HTTP.

---

## 18. API REST

Endpoints iniciales propuestos:

### Autenticación

```http
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### Usuarios

```http
GET    /api/usuarios
POST   /api/usuarios
GET    /api/usuarios/{id}
PUT    /api/usuarios/{id}
PATCH  /api/usuarios/{id}/estado
```

### Órdenes

```http
GET  /api/ordenes-trabajo
POST /api/ordenes-trabajo
GET  /api/ordenes-trabajo/{id}
PUT  /api/ordenes-trabajo/{id}
GET  /api/ordenes-trabajo/{id}/historial
```

### Programaciones

```http
GET  /api/programaciones
POST /api/programaciones
GET  /api/programaciones/{id}
POST /api/programaciones/{id}/ordenes
```

### Entregas

```http
GET  /api/entregas
POST /api/entregas
GET  /api/entregas/{id}
GET  /api/mis-ot
```

### Devoluciones

```http
POST /api/entregas/detalle/{id}/solicitar-devolucion
POST /api/entregas/detalle/{id}/confirmar-recepcion
```

### Alertas

```http
GET   /api/alertas
GET   /api/alertas/mis-alertas
PATCH /api/alertas/{id}/atender
PATCH /api/alertas/{id}/descartar
```

### Configuración

```http
GET /api/configuracion/tiempos-ot
PUT /api/configuracion/tiempos-ot/{id}
```

Los endpoints son una propuesta y pueden modificarse al desarrollar.

---

## 19. Aplicación móvil futura

La aplicación móvil no forma parte de la primera fase.

Se desarrollará posteriormente utilizando Flutter.

Consumirá la misma API REST.

No tendrá una base de datos de negocio independiente.

Deberá respetar los mismos roles, permisos y reglas del sistema web.

El backend no debe implementar reglas que solamente funcionen desde React.

---

## 20. Reglas obligatorias para el agente de IA

El agente debe actuar como desarrollador senior y respetar esta especificación.

### Antes de desarrollar

1. Leer este documento.
2. Revisar el SQL.
3. Detectar inconsistencias.
4. Proponer correcciones.
5. No inventar reglas del negocio.
6. No generar todo el proyecto sin definir previamente su arquitectura.

### Durante el desarrollo

- Utilizar arquitectura desacoplada.
- Separar frontend y backend.
- Utilizar PostgreSQL.
- Mantener módulos independientes.
- Aplicar buenas prácticas.
- Implementar validaciones en backend.
- Implementar autenticación y permisos.
- Utilizar transacciones.
- Mantener historial.
- Evitar duplicidad de datos.
- Documentar API.
- Utilizar migraciones.
- No exponer secretos.
- Crear pruebas automatizadas.

### Diseño de interfaz

La aplicación no debe parecer un CRUD genérico.

Debe tener:

- Diseño moderno.
- Navegación lateral.
- Dashboard visual.
- Indicadores y estadísticas.
- Tablas con filtros avanzados.
- Vistas de seguimiento.
- Líneas de tiempo.
- Formularios organizados.
- Confirmaciones para operaciones críticas.
- Estados visuales claros.
- Diseño responsive.

La interfaz debe priorizar la productividad y facilidad de uso.

El panel administrativo y la aplicación operativa deben tener una identidad visual coherente, pero estar organizados según sus diferentes objetivos.

### Orden de implementación

1. Revisar arquitectura y SQL.
2. Definir backend definitivo.
3. Crear proyecto PostgreSQL.
4. Implementar autenticación.
5. Implementar usuarios, roles y permisos.
6. Implementar tipos y estados.
7. Implementar órdenes.
8. Implementar programaciones.
9. Implementar entregas.
10. Implementar devoluciones y revisiones.
11. Implementar reprogramaciones.
12. Implementar historial.
13. Implementar alertas.
14. Implementar panel administrativo React.
15. Implementar aplicación operativa React.
16. Implementar reportes.
17. Realizar pruebas integrales.
18. Preparar API para futura aplicación móvil.

---

## 21. Decisiones de arquitectura definitivas

| Decisión | Estado |
|---|---|
| Aplicación web React + Vite | Confirmada |
| Panel administrativo propio | Confirmado |
| Aplicación operativa propia | Confirmada |
| No depender de Django Admin | Confirmado |
| Backend desacoplado | Confirmado |
| Django o Spring Boot | Pendiente |
| PostgreSQL | Confirmado |
| API REST | Confirmada |
| Flutter | Fase futura |
| Una aplicación web para todos los roles | Confirmado |
| Control de permisos en backend | Obligatorio |

> **Objetivo final:** construir una aplicación empresarial de gestión y seguimiento de órdenes de trabajo, modular, segura, escalable y con una experiencia de usuario profesional. La lógica de negocio debe estar centralizada en el backend y las interfaces deben limitarse a presentar y ejecutar las operaciones autorizadas mediante la API REST.