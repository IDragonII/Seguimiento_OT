# Backend — Sistema de Gestión de Órdenes de Trabajo

API REST para la gestión de órdenes de trabajo (OT): registro, programación,
entrega a técnicos, devolución con flujo de recepción administrativa y cierre.

- **Stack**: Java 21, Spring Boot 3.2.2, Spring Security + JWT, Spring Data JPA, PostgreSQL 15
- **Documentación interactiva**: Swagger UI en `http://localhost:8080/swagger-ui.html`
- **Especificación funcional**: `D:\OT\SPEC.md`
- **Esquema de base de referencia**: `D:\OT\db.sql`

---

## 1. Arranque rápido

### Con Docker (recomendado)

```bash
cd D:\OT\backend
docker-compose up -d --build
```

Levanta dos contenedores:

| Servicio   | Puerto  | Descripción                          |
|------------|---------|--------------------------------------|
| `ot-backend` | 8080  | API Spring Boot                      |
| `ot-postgres`| 5432 | PostgreSQL 15 (db: `ot`, user: `ot_user`) |

El backend espera a que PostgreSQL esté *healthy* antes de arrancar. Al iniciar,
Hibernate crea las tablas (`ddl-auto=update`) y un `DataSeeder` carga los datos
iniciales.

### Sin Docker (desarrollo local)

```bash
cd D:\OT\backend
.\mvnw.cmd spring-boot:run
```

Requiere Java 21+ y una instancia de PostgreSQL con los datos de
`src/main/resources/application.yml`.

### Variables de entorno

| Variable                    | Valor por defecto                          |
|-----------------------------|--------------------------------------------|
| `SPRING_DATASOURCE_URL`     | `jdbc:postgresql://postgres:5432/ot`       |
| `SPRING_DATASOURCE_USERNAME`| `ot_user`                                  |
| `SPRING_DATASOURCE_PASSWORD`| `ot_pass`                                  |
| `JWT_SECRET`                | clave HS256 (definir propia en producción)  |
| `SPRING_JPA_HIBERNATE_DDL-auto` | `update`                              |

---

## 2. Datos iniciales (seed)

| Recurso         | Contenido                                                        |
|-----------------|------------------------------------------------------------------|
| **Roles**       | `ADMIN`, `FACTIBILIZADOR`, `TECNICO`, `CONSULTOR`                |
| **Estados OT**  | `PROGRAMADO`, `ENTREGADO`, `DEVUELTO`, `CERRADO`                 |
| **Tipos OT**    | `Instalación nueva`, `Reubicación`, `Otros`                       |
| **Config tiempos** | `ENTREGADO` = 3 días hábiles                                  |
| **Usuario admin** | `admin@ot.local` / `Admin123*` (semilla — ver "Primer ingreso")    |

> La contraseña del admin es de semilla: **el primer login exige cambiarla**
> (§3). Cambiar también el `JWT_SECRET` antes de producción.

---

## 3. Autenticación

Autenticación por **JWT (Bearer token)**, estado sin sesión.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@ot.local", "password": "Admin123*" }
```

**200 OK**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tipo": "Bearer",
  "usuario": {
    "id": 1,
    "nombres": "Administrador",
    "apellidos": "Sistema",
    "email": "admin@ot.local",
    "rol": "ADMIN"
  },
  "modulos": [],
  "debeCambiarCredenciales": false
}
```

`debeCambiarCredenciales` es `true` mientras la contraseña siga siendo la
semilla (`Admin123*`) — ver **Primer ingreso** más abajo.

El campo `modulos` lista las claves de los módulos del **Panel de trabajo**
permitidas para el rol (`GET /api/auth/me` lo devuelve igual):

| Rol | módulos |
|-----|---------|
| ADMIN | `[]` (usa la app `/`, no el panel) |
| TECNICO | `mis-ordenes`, `mis-devoluciones`, `mi-historial` |
| CONSULTOR | `ordenes-trabajo`, `entregas`, `devoluciones`, `seguimiento`, `historial`, `reportes` |
| FACTIBILIZADOR | los de CONSULTOR + `revision`, `alertas` |

**401** — credenciales inválidas: `{ "mensaje": "Credenciales inválidas" }`

### Uso del token

Todas las rutas `/api/**` (excepto `/api/auth/**`) requieren el header:

```
Authorization: Bearer <token>
```

El token expira en **24 horas**. Sin token o con token inválido → `401`.

### Primer ingreso — cambio forzado de credenciales

Mientras la contraseña del admin siga siendo la semilla (`Admin123*`):

- `POST /login` y `GET /me` responden `"debeCambiarCredenciales": true`.
- **Toda** la API `/api/**` responde `403` (excepto `/api/auth/**` y
  `/error`):

```json
{ "codigo": "CAMBIO_CREDENCIALES_REQUERIDO", "mensaje": "Debes cambiar tu nombre, email y contraseña para continuar" }
```

- El frontend abre un modal forzado (sin ×, sin ESC, sin cierre por overlay)
  que al completarse llama a:

```http
PUT /api/auth/cambio-inicial
Authorization: Bearer <token>
Content-Type: application/json

{ "nombres": "Nombre", "apellidos": "Apellido", "email": "admin@ot.local", "nuevaPassword": "NuevaClave1" }
```

Validaciones (`400`): nombres/apellidos obligatorios, email con formato válido
y sin duplicar, contraseña de ≥8 caracteres con mayúscula y número y distinta
de la actual. El email puede conservarse; si cambia, el token anterior queda
inválido (el subject JWT es el email) y la respuesta incluye uno **nuevo** con
la misma forma que el login y `debeCambiarCredenciales: false`. Después de
cambiar, la API queda desbloqueada (la detección es por comparación con la
contraseña de semilla, sin columna nueva).

---

## 4. Roles y permisos

| Función                                | ADMIN | FACTIBILIZADOR | TECNICO | CONSULTOR |
|----------------------------------------|:-----:|:--------------:|:-------:|:---------:|
| Login / ver perfil                     | ✅ | ✅ | ✅ | ✅ |
| Listar/crear/editar usuarios           | ✅ | ❌ | ❌ | ❌ |
| Configurar tiempos máximos             | ✅ | ❌ | ❌ | ❌ |
| Registrar OT                           | ✅ | ✅ | ❌ | ❌ |
| Consultar todas las OT                 | ✅ | ✅ | ❌ | ✅ |
| Crear programaciones y asignar OT      | ✅ | ✅ | ❌ | ❌ |
| Registrar entregas                     | ✅ | ✅ | ❌ | ❌ |
| Ver "mis OT" (asignadas)               | ✅ | ✅ | ✅ | ✅ |
| Solicitar devolución de una OT         | ❌* | ❌* | ✅ | ❌ |
| Confirmar recepción administrativa     | ✅ | ✅ | ❌ | ❌ |
| Gestionar alertas                      | ✅ | ✅ | ✅ | ✅ |

\* Solo el técnico asignado a la entrega puede solicitar su devolución (control a nivel de endpoint).

Los permisos críticos se refuerzan con `@PreAuthorize` a nivel de método; el
resto de reglas las aplica la cadena de filtros de seguridad.

---

## 5. Ciclo de vida de una OT

```
REGISTRO ──► PROGRAMADO ──► ENTREGADO ──► DEVUELTO ──► CERRADO
 (create)    (create)       (entrega)     (solicitud   (dato histórico)
                                          devolución)
```

1. **Registro** — se crea la OT con estado `PROGRAMADO` y entrada en el historial.
2. **Programación** — se agrupan OT en una programación por fecha y se asignan.
3. **Entrega** — se entrega a un técnico; la OT pasa a `ENTREGADO`.
4. **Devolución** — el técnico asignado solicita la devolución → `DEVUELTO`.
5. **Recepción** — un administrador/factibilizador confirma la recepción.
6. **Cierre** — la OT queda `CERRADO`.

Cada movimiento genera un registro en `historial_ot` que **nunca se sobrescribe**
(accion: `REGISTRO`, `ENTREGA`, `SOLICITUD_DEVOLUCION`, `CONFIRMACION_RECEPCION`).

### 5.1 Campo `ubicacion` de la OT

`ubicacion` **no es un estado**: es un campo de texto (`ordenes_trabajo.ubicacion`)
que evoluciona con el ciclo:

| Momento | Valor |
|---------|-------|
| Registro de la OT | `Por entregar` |
| Entrega al técnico | `Con técnico <nombres> <apellidos>` |
| Confirmación de recepción | Lo escribe el administrador, uno a uno por OT |

En la recepción masiva el campo es **obligatorio** para toda OT seleccionada
(`400: "Debe indicar la ubicación de la OT <número>"`) y queda registrado en el
historial junto a la observación.

---

## 6. Endpoints

> `🔒` = requiere rol `ADMIN`. `🔒 AF` = requiere `ADMIN` o `FACTIBILIZADOR`. `Auth` = requiere token válido (cualquier rol).

### 6.1 Autenticación — `/api/auth`

| Método | Ruta        | Auth | Descripción                          |
|--------|-------------|:----:|--------------------------------------|
| POST   | `/login`    |  —   | Devuelve JWT + datos del usuario     |
| GET    | `/me`       | Auth | Perfil del usuario autenticado       |
| PUT    | `/cambio-inicial` | Auth | Primer ingreso: cambia nombre, email y contraseña (ver §3) |

### 6.2 Órdenes de trabajo — `/api/ordenes-trabajo`

| Método | Ruta                      | Auth | Descripción |
|--------|---------------------------|:----:|-------------|
| GET    | `/`                       | Auth | Lista todas las OT |
| GET    | `/disponibles`            | Auth | OT en estado `PROGRAMADO` **sin** programación asignada (para elegir en nuevas programaciones) |
| GET    | `/{id}`                   | Auth | Detalle de una OT (404 si no existe) |
| POST   | `/`                       | Auth | Registra una OT en estado `PROGRAMADO` |
| GET    | `/{id}/historial`         | Auth | Historial completo de movimientos (más reciente primero) |

**POST /**

```json
{ "tipoOTId": 1, "numeroOT": 1001, "descripcion": "Instalación en sitio A" }
```

- La combinación `(tipoOTId, numeroOT)` es **única** → `400` si se repite.
- Devuelve la OT creada con su estado `PROGRAMADO` y `registradoPor`.

### 6.3 Programaciones — `/api/programaciones`

| Método | Ruta            | Auth | Descripción |
|--------|-----------------|:----:|-------------|
| GET    | `/`             | Auth | Lista programaciones (más recientes primero) |
| GET    | `/{id}`         | Auth | Programación + sus detalles |
| POST   | `/`             | Auth | Crea una programación |
| POST   | `/{id}/ordenes` | Auth | Asigna OT a la programación |

**POST /**

```json
{ "fechaProgramacion": "2026-11-10", "observacion": "Ruta norte" }
```

**POST /{id}/ordenes**

```json
{ "ordenIds": [1, 2, 3] }
```

- `400` si una OT ya está en la programación: `{ "mensaje": "La OT 1 ya está en esta programación" }`

### 6.4 Entregas y devoluciones — `/api/entregas`

| Método | Ruta                                   | Auth | Descripción |
|--------|----------------------------------------|:----:|-------------|
| GET    | `/`                                    | Auth | Lista entregas (más recientes primero) |
| GET    | `/{id}`                                | Auth | Entrega + sus detalles |
| POST   | `/`                                    | Auth | Registra entrega y pasa las OT a `ENTREGADO` |
| GET    | `/mis-ot`                              | Auth | OT asignadas al usuario autenticado |
| GET    | `/tecnicos`                            | Auth | OT entregadas agrupadas por técnico (`total` + `ots[]` con `estado` y `ubicacion`) |
| POST   | `/detalle/{id}/solicitar-devolucion`   | Auth | Técnico asignado solicita devolución → `DEVUELTO` |
| POST   | `/detalle/{id}/confirmar-recepcion`    | Auth | Confirma recepción administrativa |
| POST   | `/{entregaId}/recepcion`               | Auth | Recepción masiva: `DEVUELTO` + ubicación por OT |

**POST /**

```json
{
  "observacion": "Entrega del día",
  "detalles": [
    { "programacionDetalleId": 1, "tecnicoId": 3 },
    { "programacionDetalleId": 2, "tecnicoId": 3 }
  ]
}
```

- `400` si la OT ya tiene una entrega pendiente (sin fecha de devolución).

**POST /detalle/{id}/solicitar-devolucion**

```json
{ "observacion": "Trabajo finalizado" }
```

- `403` si el usuario no es el técnico asignado.
- `400` si la OT ya fue devuelta.

**POST /detalle/{id}/confirmar-recepcion**

```json
{ "observacion": "Recibido conforme", "ubicacion": "Bodega central" }
```

- `400` si ya fue recibida administrativamente.
- `ubicacion` (opcional): actualiza la ubicación de la OT.

**POST /{entregaId}/recepcion**

```json
{
  "detalleIds": [10, 11],
  "observacion": "Recepción en almacén",
  "ubicaciones": { "10": "Bodega central", "11": "Subestación norte" }
}
```

- `400` si falta `ubicaciones` para alguna OT seleccionada.

### 6.5 Usuarios — `/api/usuarios`

| Método | Ruta            | Auth    | Descripción |
|--------|-----------------|:-------:|-------------|
| GET    | `/`             | 🔒      | Lista usuarios |
| GET    | `/tecnicos`     | 🔒 AF   | Lista solo los usuarios con rol `TECNICO` |
| GET    | `/{id}`         | 🔒      | Detalle de usuario |
| POST   | `/`             | 🔒      | Crea usuario (hashea la contraseña con BCrypt) |
| PUT    | `/{id}`         | 🔒      | Actualiza usuario (contraseña opcional) |
| PATCH  | `/{id}/estado`  | 🔒      | Activa/desactiva usuario |

**POST /**

```json
{
  "nombres": "Ana",
  "apellidos": "Pérez",
  "email": "ana@ot.local",
  "password": "Secreta123*",
  "rolId": 3
}
```

**PATCH /{id}/estado**

```json
{ "activo": false }
```

> La contraseña y el hash **nunca** se incluyen en las respuestas JSON.

### 6.6 Configuración — `/api/configuracion`

| Método | Ruta                   | Auth      | Descripción |
|--------|------------------------|:---------:|-------------|
| GET    | `/tiempos-ot`          | Auth      | Límites de días hábiles por estado (incluye `activo`) |
| PUT    | `/tiempos-ot/{id}`     | Auth 🔒   | Actualiza los días máximos |
| POST   | `/tiempos-ot`          | Auth 🔒   | Crea configuración para un estado |
| PATCH  | `/tiempos-ot/{id}/limite` | Auth 🔒 | Activa/desactiva el tiempo límite del estado |

**PUT /tiempos-ot/{id}**

```json
{ "diasHabilesMaximos": 5 }
```

**PATCH /tiempos-ot/{id}/limite**

```json
{ "activo": false }
```

- `activo: false` → el estado queda **sin tiempo límite** y `AlertaService` deja de generar alertas de vencimiento para él.
- `activo: true` → restaura el límite con los días configurados.
- `400` si falta `activo`; `404` si la configuración no existe.

**POST /tiempos-ot**

```json
{ "estadoId": 2, "diasHabilesMaximos": 5 }
```

- `400` si ya existe configuración para ese estado.

### 6.7 Alertas — `/api/alertas`

| Método | Ruta              | Auth | Descripción |
|--------|-------------------|:----:|-------------|
| GET    | `/`               | Auth | Todas las alertas |
| GET    | `/mis-alertas`    | Auth | Alertas sin leer del usuario |
| PATCH  | `/{id}/atender`   | Auth | Marca alerta como `ATENDIDA` |
| PATCH  | `/{id}/descartar` | Auth | Marca alerta como `DESCARTADA` |

**PATCH /{id}/atender** y **PATCH /{id}/descartar**

```json
{ "observacion": "Atendida por admin" }
```

### 6.8 Catálogo — `/api`

| Método | Ruta          | Auth | Descripción |
|--------|---------------|:----:|-------------|
| GET    | `/tipos-ot`   | Auth | Lista los tipos de OT (`Instalación nueva`, `Reubicación`, `Otros`) |
| GET    | `/estados`    | Auth | Lista los estados de la OT (`PROGRAMADO`, `ENTREGADO`, `DEVUELTO`, `CERRADO`) |

---

## 7. Convención de errores

| Código | Cuándo |
|--------|--------|
| `400` | Validación fallida, duplicados, regla de negocio |
| `401` | Sin token, token expirado o credenciales inválidas |
| `403` | Token válido pero sin permiso (rol insuficiente) |
| `404` | Recurso inexistente |
| `500` | Error interno |

Los errores de negocio devuelven JSON con clave `mensaje`:

```json
{ "mensaje": "Ya existe una OT con este tipo y número" }
```

---

## 8. Estructura del proyecto

```
backend/
├── docker-compose.yml
├── Dockerfile
├── pom.xml
└── src/main/
    ├── java/com/ot/
    │   ├── config/DataSeeder.java        # Datos iniciales
    │   ├── controller/                   # 7 controladores REST
    │   ├── model/                        # 14 entidades JPA
    │   ├── repository/                   # 14 repositorios Spring Data
    │   └── security/                     # JWT, SecurityConfig, UserDetailsService
    └── resources/application.yml
```

---

## 9. Pruebas manuales (PowerShell)

```powershell
# Login
$login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@ot.local","password":"Admin123*"}'

$h = @{ Authorization = "Bearer $($login.token)" }

# Perfil
Invoke-RestMethod -Uri "http://localhost:8080/api/auth/me" -Headers $h

# Registrar OT
Invoke-RestMethod -Uri "http://localhost:8080/api/ordenes-trabajo" `
  -Method POST -Headers $h -ContentType "application/json" `
  -Body '{"tipoOTId":1,"numeroOT":1001,"descripcion":"Instalación sitio A"}'

# Listar OT
Invoke-RestMethod -Uri "http://localhost:8080/api/ordenes-trabajo" -Headers $h
```
