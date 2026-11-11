1. SQL completo de PostgreSQL
Este script crea la estructura desde cero. Ejecútalo en una base de datos nueva.


sql

-- =====================================================
-- SISTEMA DE SEGUIMIENTO DE ORDENES DE TRABAJO
-- MOTOR POSTGRESQL
-- VERSION 1.0
-- =====================================================

-- =====================================================
-- 1. ROLES
-- =====================================================

CREATE TABLE roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO roles (nombre, descripcion) VALUES
('ADMIN', 'Administrador del sistema'),
('FACTIBILIZADOR', 'Registra y programa órdenes de trabajo'),
('TECNICO', 'Recibe y devuelve órdenes de trabajo'),
('CONSULTOR', 'Consulta órdenes de trabajo');

-- =====================================================
-- 2. USUARIOS
-- =====================================================

CREATE TABLE usuarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    rol_id BIGINT NOT NULL REFERENCES roles(id),

    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_rol
ON usuarios(rol_id);

-- =====================================================
-- 3. TIPOS DE OT
-- =====================================================

CREATE TABLE tipos_ot (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. ESTADOS DE OT
-- =====================================================

CREATE TABLE estados_ot (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nombre VARCHAR(30) NOT NULL UNIQUE,
    descripcion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO estados_ot (nombre, descripcion) VALUES
('PROGRAMADO', 'OT programada pendiente de entrega'),
('ENTREGADO', 'OT entregada a un técnico'),
('DEVUELTO', 'OT devuelta pendiente de revisión'),
('CERRADO', 'OT cerrada definitivamente');

-- =====================================================
-- 5. ORDENES DE TRABAJO
-- =====================================================

CREATE TABLE ordenes_trabajo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    tipo_ot_id BIGINT NOT NULL
        REFERENCES tipos_ot(id),

    -- Codigo ingresado manualmente por el usuario
    numero_ot INTEGER NOT NULL,

    estado_id BIGINT NOT NULL
        REFERENCES estados_ot(id),

    descripcion TEXT,

    -- Ubicacion fisica actual de la OT.
    -- Por defecto al registrar: 'Por entregar'.
    -- Al entregar a tecnico: 'Con tecnico <nombre>'.
    -- Al confirmar recepcion: la escribe el administrador.
    ubicacion VARCHAR(120),

    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    fecha_inicio_estado TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    registrado_por BIGINT NOT NULL
        REFERENCES usuarios(id),

    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_tipo_numero_ot
        UNIQUE(tipo_ot_id, numero_ot),

    CONSTRAINT chk_numero_ot
        CHECK(numero_ot  0)
);

CREATE INDEX idx_ordenes_estado
ON ordenes_trabajo(estado_id);

CREATE INDEX idx_ordenes_tipo_numero
ON ordenes_trabajo(tipo_ot_id, numero_ot);

CREATE INDEX idx_ordenes_fecha_estado
ON ordenes_trabajo(fecha_inicio_estado);

-- =====================================================
-- 6. PROGRAMACIONES
-- =====================================================

CREATE TABLE programaciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    fecha_programacion DATE NOT NULL,

    programado_por BIGINT NOT NULL
        REFERENCES usuarios(id),

    observacion TEXT,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_programaciones_fecha
ON programaciones(fecha_programacion);

-- =====================================================
-- 7. DETALLE DE PROGRAMACIONES
-- =====================================================

CREATE TABLE programacion_detalle (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    programacion_id BIGINT NOT NULL
        REFERENCES programaciones(id),

    orden_trabajo_id BIGINT NOT NULL
        REFERENCES ordenes_trabajo(id),

    observacion TEXT,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ot_programacion
        UNIQUE(programacion_id, orden_trabajo_id),

    CONSTRAINT uq_programacion_detalle_ot
        UNIQUE(id, orden_trabajo_id)
);

CREATE INDEX idx_programacion_detalle_ot
ON programacion_detalle(orden_trabajo_id);

-- =====================================================
-- 8. ENTREGAS
-- =====================================================

CREATE TABLE entregas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    fecha_entrega TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    entregado_por BIGINT NOT NULL
        REFERENCES usuarios(id),

    observacion TEXT,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entregas_fecha
ON entregas(fecha_entrega);

-- =====================================================
-- 9. DETALLE DE ENTREGAS
-- =====================================================

CREATE TABLE entrega_detalle (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    entrega_id BIGINT NOT NULL
        REFERENCES entregas(id),

    programacion_detalle_id BIGINT NOT NULL,

    orden_trabajo_id BIGINT NOT NULL,

    -- Tecnico asignado individualmente a cada OT
    tecnico_id BIGINT NOT NULL
        REFERENCES usuarios(id),

    fecha_devolucion TIMESTAMPTZ,

    -- Usuario que recibe y registra la devolucion
    recibido_por BIGINT
        REFERENCES usuarios(id),

    observacion TEXT,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (
        programacion_detalle_id,
        orden_trabajo_id
    )
    REFERENCES programacion_detalle(
        id,
        orden_trabajo_id
    ),

    -- Una programacion_detalle solo puede entregarse una vez.
    -- Para una nueva entrega se crea otra programacion.
    CONSTRAINT uq_entrega_programacion
        UNIQUE(programacion_detalle_id),

    CONSTRAINT chk_devolucion_receptor
        CHECK (
            (fecha_devolucion IS NULL AND recibido_por IS NULL)
            OR
            (fecha_devolucion IS NOT NULL AND recibido_por IS NOT NULL)
        )
);

-- Una OT no puede tener dos entregas pendientes.
CREATE UNIQUE INDEX uq_ot_entrega_pendiente
ON entrega_detalle(orden_trabajo_id)
WHERE fecha_devolucion IS NULL;

CREATE INDEX idx_entrega_tecnico
ON entrega_detalle(tecnico_id);

CREATE INDEX idx_entrega_fecha_devolucion
ON entrega_detalle(fecha_devolucion);

CREATE INDEX idx_entrega_ot
ON entrega_detalle(orden_trabajo_id);

-- =====================================================
-- 10. HISTORIAL DE OT
-- =====================================================

CREATE TABLE historial_ot (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    orden_trabajo_id BIGINT NOT NULL
        REFERENCES ordenes_trabajo(id),

    usuario_id BIGINT NOT NULL
        REFERENCES usuarios(id),

    estado_anterior_id BIGINT
        REFERENCES estados_ot(id),

    estado_nuevo_id BIGINT
        REFERENCES estados_ot(id),

    programacion_detalle_id BIGINT
        REFERENCES programacion_detalle(id),

    entrega_detalle_id BIGINT
        REFERENCES entrega_detalle(id),

    accion VARCHAR(100) NOT NULL,

    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    observacion TEXT
);

CREATE INDEX idx_historial_orden
ON historial_ot(orden_trabajo_id, fecha DESC);

CREATE INDEX idx_historial_usuario
ON historial_ot(usuario_id);

-- =====================================================
-- 11. CONFIGURACION DE TIEMPOS POR ESTADO
-- =====================================================

CREATE TABLE configuracion_tiempos_ot (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    estado_id BIGINT NOT NULL
        REFERENCES estados_ot(id),

    dias_habiles_maximos INTEGER NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_config_estado
        UNIQUE(estado_id),

    CONSTRAINT chk_dias_maximos
        CHECK(dias_habiles_maximos = 0)
);

-- Los tiempos se configurarán desde el sistema.
-- No se insertan valores porque deben ser definidos
-- según las reglas reales del negocio.

-- =====================================================
-- 12. CALENDARIO NO LABORAL
-- =====================================================

CREATE TABLE calendario_no_laboral (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    fecha DATE NOT NULL UNIQUE,

    descripcion VARCHAR(200) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_calendario_fecha
ON calendario_no_laboral(fecha);

-- =====================================================
-- 13. ALERTAS DE OT
-- =====================================================

CREATE TABLE alertas_ot (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    orden_trabajo_id BIGINT NOT NULL
        REFERENCES ordenes_trabajo(id),

    estado_id BIGINT NOT NULL
        REFERENCES estados_ot(id),

    -- Transicion concreta que originó el vencimiento
    historial_id BIGINT NOT NULL UNIQUE
        REFERENCES historial_ot(id),

    tipo_alerta VARCHAR(50) NOT NULL,

    fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    dias_habiles_transcurridos INTEGER NOT NULL,

    dias_habiles_maximos INTEGER NOT NULL,

    estado_alerta VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',

    fecha_resolucion TIMESTAMPTZ,

    observacion TEXT,

    CONSTRAINT chk_estado_alerta
        CHECK(
            estado_alerta IN (
                'PENDIENTE',
                'ATENDIDA',
                'DESCARTADA'
            )
        ),

    CONSTRAINT chk_dias_alerta
        CHECK(
            dias_habiles_transcurridos = 0
            AND dias_habiles_maximos = 0
        )
);

CREATE INDEX idx_alertas_estado
ON alertas_ot(estado_alerta, fecha_generacion DESC);

CREATE INDEX idx_alertas_orden
ON alertas_ot(orden_trabajo_id);

-- =====================================================
-- 14. DESTINATARIOS DE ALERTAS
-- =====================================================

CREATE TABLE alertas_destinatarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    alerta_id BIGINT NOT NULL
        REFERENCES alertas_ot(id),

    usuario_id BIGINT NOT NULL
        REFERENCES usuarios(id),

    fecha_notificacion TIMESTAMPTZ,

    fecha_lectura TIMESTAMPTZ,

    fecha_atencion TIMESTAMPTZ,

    CONSTRAINT uq_alerta_usuario
        UNIQUE(alerta_id, usuario_id)
);

CREATE INDEX idx_destinatarios_usuario
ON alertas_destinatarios(usuario_id, fecha_lectura);

-- =====================================================
-- FIN DEL ESQUEMA PRINCIPAL
-- =====================================================
2. Datos iniciales que debes configurar
Después de crear las tablas, registra los tipos de OT. Por ejemplo


sql
INSERT INTO tipos_ot (nombre, descripcion) VALUES
('INSTALACION', 'Orden de instalación'),
('REPARACION', 'Orden de reparación');
Los tiempos máximos los configurarás desde el panel administrativo. Por ejemplo, cuando decidas los plazos reales


sql
INSERT INTO configuracion_tiempos_ot
    (estado_id, dias_habiles_maximos)
SELECT id, 3
FROM estados_ot
WHERE nombre = 'ENTREGADO';
Este ejemplo configura tres días hábiles para el estado ENTREGADO.