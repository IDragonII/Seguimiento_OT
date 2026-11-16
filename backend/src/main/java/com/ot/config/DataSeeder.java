package com.ot.config;

import com.ot.model.*;
import com.ot.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstadoOTRepository estadoOTRepository;
    private final TipoOTRepository tipoOTRepository;
    private final ConfiguracionTiemposOTRepository configuracionTiemposOTRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @Value("${RESET_DB:false}")
    private boolean resetDb;

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    public DataSeeder(RolRepository rolRepository,
                      UsuarioRepository usuarioRepository,
                      EstadoOTRepository estadoOTRepository,
                      TipoOTRepository tipoOTRepository,
                      ConfiguracionTiemposOTRepository configuracionTiemposOTRepository,
                      PasswordEncoder passwordEncoder,
                      JdbcTemplate jdbcTemplate) {
        this.rolRepository = rolRepository;
        this.usuarioRepository = usuarioRepository;
        this.estadoOTRepository = estadoOTRepository;
        this.tipoOTRepository = tipoOTRepository;
        this.configuracionTiemposOTRepository = configuracionTiemposOTRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        resetearUsuariosSiCorresponde();

        if (rolRepository.count() == 0) {
            Map.of(
                "ADMIN", "Administrador del sistema",
                "FACTIBILIZADOR", "Registra y programa órdenes de trabajo",
                "TECNICO", "Recibe y devuelve órdenes de trabajo",
                "CONSULTOR", "Consulta órdenes de trabajo"
            ).forEach((nombre, descripcion) -> {
                Rol rol = new Rol();
                rol.setNombre(nombre);
                rol.setDescripcion(descripcion);
                rolRepository.save(rol);
            });
            log.info("Roles iniciales creados");
        }

        if (estadoOTRepository.count() == 0) {
            List.of(
                Map.entry("PROGRAMADO", "OT programada pendiente de entrega"),
                Map.entry("ENTREGADO", "OT entregada a un técnico"),
                Map.entry("DEVUELTO", "OT devuelta pendiente de revisión"),
                Map.entry("CERRADO", "OT cerrada definitivamente")
            ).forEach(e -> {
                EstadoOT estado = new EstadoOT();
                estado.setNombre(e.getKey());
                estado.setDescripcion(e.getValue());
                estadoOTRepository.save(estado);
            });
            log.info("Estados OT iniciales creados");
        }

        renombrarTipoSiFalta("INSTALACION", "Instalación nueva", "Instalación de un servicio nuevo");
        renombrarTipoSiFalta("REPARACION", "Reubicación", "Cambio de ubicación de un servicio");
        renombrarTipoSiFalta("Reconexiones", "Reubicación", "Cambio de ubicación de un servicio");
        crearTipoSiFalta("Instalación nueva", "Instalación de un servicio nuevo");
        crearTipoSiFalta("Reubicación", "Cambio de ubicación de un servicio");
        crearTipoSiFalta("Otros", "Otros trabajos no clasificados");
        log.info("Tipos OT asegurados");

        if (configuracionTiemposOTRepository.count() == 0) {
            estadoOTRepository.findByNombre("ENTREGADO").ifPresent(estado -> {
                ConfiguracionTiemposOT config = new ConfiguracionTiemposOT();
                config.setEstado(estado);
                config.setDiasHabilesMaximos(3);
                configuracionTiemposOTRepository.save(config);
            });
            log.info("Configuración de tiempos OT inicial creada");
        }

        if (usuarioRepository.findByEmail(CredencialesSemilla.EMAIL_ADMIN).isEmpty()) {
            Rol adminRol = rolRepository.findByNombre("ADMIN").orElseThrow();

            Usuario admin = new Usuario();
            admin.setRol(adminRol);
            admin.setNombres("Administrador");
            admin.setApellidos("Sistema");
            admin.setEmail(CredencialesSemilla.EMAIL_ADMIN);
            admin.setPasswordHash(passwordEncoder.encode(CredencialesSemilla.PASSWORD_ADMIN));
            admin.setActivo(true);
            usuarioRepository.save(admin);
            log.info("Usuario administrador inicial creado ({})", CredencialesSemilla.EMAIL_ADMIN);
        }
    }

    /**
     * RESET TEMPORAL DE USUARIOS (producción): elimina todos los usuarios
     * excepto admin@ot.local, reasignando sus FKs (OTs, programaciones,
     * entregas, historial) al admin. Se activa con la env var RESET_DB=true
     * o automáticamente si el datasource apunta a Render (contiene "render").
     * En local (localhost/postgres) NUNCA se activa.
     * ESTE BLOQUE ES PROVISIONAL: eliminarlo en el commit siguiente.
     */
    private void resetearUsuariosSiCorresponde() {
        boolean porEnv = resetDb;
        boolean porRender = datasourceUrl != null && datasourceUrl.toLowerCase().contains("render");
        if (!porEnv && !porRender) {
            return;
        }

        var adminOpt = usuarioRepository.findByEmail(CredencialesSemilla.EMAIL_ADMIN);
        if (adminOpt.isEmpty()) {
            int borrados = jdbcTemplate.update("DELETE FROM usuarios");
            log.warn("RESET usuarios (provisional): no existía admin; eliminados {}", borrados);
            return;
        }

        Long adminId = adminOpt.get().getId();
        int fk = 0;
        fk += jdbcTemplate.update(
            "UPDATE ordenes_trabajo SET registrado_por = ? WHERE registrado_por <> ?", adminId, adminId);
        fk += jdbcTemplate.update(
            "UPDATE programaciones SET programado_por = ? WHERE programado_por <> ?", adminId, adminId);
        fk += jdbcTemplate.update(
            "UPDATE entregas SET entregado_por = ? WHERE entregado_por <> ?", adminId, adminId);
        fk += jdbcTemplate.update(
            "UPDATE entrega_detalle SET tecnico_id = ? WHERE tecnico_id <> ?", adminId, adminId);
        fk += jdbcTemplate.update(
            "UPDATE entrega_detalle SET recibido_por = ? WHERE recibido_por IS NOT NULL AND recibido_por <> ?",
            adminId, adminId);
        fk += jdbcTemplate.update(
            "UPDATE historial_ot SET usuario_id = ? WHERE usuario_id <> ?", adminId, adminId);
        int destinatarios = jdbcTemplate.update(
            "DELETE FROM alertas_destinatarios WHERE usuario_id <> ?", adminId);
        int borrados = jdbcTemplate.update(
            "DELETE FROM usuarios WHERE email <> ?", CredencialesSemilla.EMAIL_ADMIN);

        // Restaura el admin a credenciales semilla para que el "reinicio"
        // deje un acceso conocido: Admin123* + modal de primer ingreso.
        jdbcTemplate.update(
            "UPDATE usuarios SET nombres = ?, apellidos = ?, password_hash = ?, "
                + "activo = true, debe_cambiar_credenciales = true WHERE email = ?",
            "Administrador", "Sistema",
            passwordEncoder.encode(CredencialesSemilla.PASSWORD_ADMIN),
            CredencialesSemilla.EMAIL_ADMIN);

        log.warn(
            "RESET usuarios (provisional): eliminados {}, FKs reasignadas a admin {}, destinatarios de alertas borrados {}, admin restaurado a semilla",
            borrados, fk, destinatarios);
    }

    private void renombrarTipoSiFalta(String nombreViejo, String nombreNuevo, String descripcion) {
        if (tipoOTRepository.findByNombre(nombreNuevo).isEmpty()) {
            tipoOTRepository.findByNombre(nombreViejo).ifPresent(tipo -> {
                tipo.setNombre(nombreNuevo);
                tipo.setDescripcion(descripcion);
                tipoOTRepository.save(tipo);
                log.info("Tipo OT '{}' renombrado a '{}'", nombreViejo, nombreNuevo);
            });
        }
    }

    private void crearTipoSiFalta(String nombre, String descripcion) {
        if (tipoOTRepository.findByNombre(nombre).isEmpty()) {
            TipoOT tipo = new TipoOT();
            tipo.setNombre(nombre);
            tipo.setDescripcion(descripcion);
            tipoOTRepository.save(tipo);
            log.info("Tipo OT '{}' creado", nombre);
        }
    }
}
