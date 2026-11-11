package com.ot.config;

import com.ot.model.*;
import com.ot.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
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

    public DataSeeder(RolRepository rolRepository,
                      UsuarioRepository usuarioRepository,
                      EstadoOTRepository estadoOTRepository,
                      TipoOTRepository tipoOTRepository,
                      ConfiguracionTiemposOTRepository configuracionTiemposOTRepository,
                      PasswordEncoder passwordEncoder) {
        this.rolRepository = rolRepository;
        this.usuarioRepository = usuarioRepository;
        this.estadoOTRepository = estadoOTRepository;
        this.tipoOTRepository = tipoOTRepository;
        this.configuracionTiemposOTRepository = configuracionTiemposOTRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
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

        if (usuarioRepository.findByEmail("admin@ot.local").isEmpty()) {
            Rol adminRol = rolRepository.findByNombre("ADMIN").orElseThrow();

            Usuario admin = new Usuario();
            admin.setRol(adminRol);
            admin.setNombres("Administrador");
            admin.setApellidos("Sistema");
            admin.setEmail("admin@ot.local");
            admin.setPasswordHash(passwordEncoder.encode("Admin123*"));
            admin.setActivo(true);
            usuarioRepository.save(admin);
            log.info("Usuario administrador inicial creado (admin@ot.local)");
        }
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
