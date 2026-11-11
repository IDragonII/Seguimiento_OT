package com.ot.service;

import com.ot.model.*;
import com.ot.repository.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AlertaService {

    private final OrdenTrabajoRepository ordenTrabajoRepository;
    private final EstadoOTRepository estadoOTRepository;
    private final ConfiguracionTiemposOTRepository configuracionTiemposOTRepository;
    private final CalendarioNoLaboralRepository calendarioNoLaboralRepository;
    private final AlertasOTRepository alertaRepository;
    private final AlertasDestinatariosRepository destinatarioRepository;
    private final UsuarioRepository usuarioRepository;
    private final EntregaDetalleRepository entregaDetalleRepository;
    private final HistorialOTRepository historialOTRepository;

    public AlertaService(OrdenTrabajoRepository ordenTrabajoRepository,
                         EstadoOTRepository estadoOTRepository,
                         ConfiguracionTiemposOTRepository configuracionTiemposOTRepository,
                         CalendarioNoLaboralRepository calendarioNoLaboralRepository,
                         AlertasOTRepository alertaRepository,
                         AlertasDestinatariosRepository destinatarioRepository,
                         UsuarioRepository usuarioRepository,
                         EntregaDetalleRepository entregaDetalleRepository,
                         HistorialOTRepository historialOTRepository) {
        this.ordenTrabajoRepository = ordenTrabajoRepository;
        this.estadoOTRepository = estadoOTRepository;
        this.configuracionTiemposOTRepository = configuracionTiemposOTRepository;
        this.calendarioNoLaboralRepository = calendarioNoLaboralRepository;
        this.alertaRepository = alertaRepository;
        this.destinatarioRepository = destinatarioRepository;
        this.usuarioRepository = usuarioRepository;
        this.entregaDetalleRepository = entregaDetalleRepository;
        this.historialOTRepository = historialOTRepository;
    }

    /**
     * Tarea programada que se ejecuta cada hora para revisar OTs
     * que hayan superado el tiempo máximo configurado en su estado actual.
     * Solo tienen tiempo límite los estados con una configuración activa
     * (activo = true); una configuración desactivada ("Sin límite") o
     * ausente significa que ese estado no genera alertas de vencimiento.
     */
    @Scheduled(fixedRate = 3600000) // cada hora
    @Transactional
    public void revisarOTsVencidas() {
        List<EstadoOT> estadosConTiempoLimite = configuracionTiemposOTRepository.findAll().stream()
                .filter(c -> !Boolean.FALSE.equals(c.getActivo()))
                .map(ConfiguracionTiemposOT::getEstado)
                .filter(Objects::nonNull)
                .toList();
        if (estadosConTiempoLimite.isEmpty()) {
            return;
        }

        List<OrdenTrabajo> otActivas = ordenTrabajoRepository.findByEstadoIn(estadosConTiempoLimite);

        for (OrdenTrabajo ot : otActivas) {
            Optional<ConfiguracionTiemposOT> configOpt = configuracionTiemposOTRepository.findByEstadoId(ot.getEstado().getId());
            if (configOpt.isEmpty()) {
                continue;
            }

            ConfiguracionTiemposOT config = configOpt.get();
            if (Boolean.FALSE.equals(config.getActivo())) {
                continue;
            }
            Integer diasMaximos = config.getDiasHabilesMaximos();
            if (diasMaximos == null || diasMaximos <= 0) {
                continue;
            }

            LocalDateTime fechaInicio = ot.getFechaInicioEstado();
            LocalDateTime ahora = LocalDateTime.now();

            long diasHabilesTranscurridos = calcularDiasHabiles(fechaInicio.toLocalDate(), ahora.toLocalDate());

            if (diasHabilesTranscurridos > diasMaximos) {
                // Verificar si ya existe alerta PENDIENTE para esta OT en este estado
                List<AlertasOT> alertasExistentes = alertaRepository.findByOrdenTrabajoIdAndEstadoIdAndEstadoAlerta(
                        ot.getId(), ot.getEstado().getId(), "PENDIENTE");
                if (!alertasExistentes.isEmpty()) {
                    continue;
                }

                List<Usuario> admins = usuarioRepository.findByRolNombre("ADMIN");

                // Historial primero: historial_id y usuario_id son NOT NULL en la BD
                HistorialOT historial = new HistorialOT();
                historial.setOrdenTrabajo(ot);
                historial.setUsuario(admins != null && !admins.isEmpty()
                    ? admins.get(0)
                    : ot.getRegistradoPor());
                historial.setEstadoAnterior(ot.getEstado());
                historial.setEstadoNuevo(ot.getEstado());
                historial.setAccion("ALERTA_VENCIMIENTO");
                historial.setObservacion("Alerta generada: OT lleva " + diasHabilesTranscurridos +
                        " días hábiles en estado " + ot.getEstado().getNombre() +
                        " (máximo: " + diasMaximos + ")");
                historial = historialOTRepository.save(historial);

                // Alerta vinculada al historial (historial_id NOT NULL)
                AlertasOT alerta = new AlertasOT();
                alerta.setOrdenTrabajo(ot);
                alerta.setEstado(ot.getEstado());
                alerta.setHistorial(historial);
                alerta.setTipoAlerta("VENCIMIENTO_TIEMPO_ESTADO");
                alerta.setDiasHabilesTranscurridos((int) diasHabilesTranscurridos);
                alerta.setDiasHabilesMaximos(diasMaximos);
                alerta.setEstadoAlerta("PENDIENTE");
                alerta.setObservacion("OT " + ot.getNumeroOT() + " lleva " + diasHabilesTranscurridos +
                        " días hábiles en estado " + ot.getEstado().getNombre() +
                        " (máximo: " + diasMaximos + ")");
                alerta = alertaRepository.save(alerta);

                // Agregar destinatarios: ADMIN y el técnico asignado (si hay entrega)
                List<Usuario> destinatarios = new ArrayList<>();
                if (admins != null) {
                    destinatarios.addAll(admins);
                }

                // Agregar el técnico de la entrega si existe
                List<EntregaDetalle> detalles = entregaDetalleRepository.findByOrdenTrabajoId(ot.getId());
                for (EntregaDetalle detalle : detalles) {
                    if (detalle.getTecnico() != null && !destinatarios.contains(detalle.getTecnico())) {
                        destinatarios.add(detalle.getTecnico());
                    }
                }

                for (Usuario destinatario : destinatarios) {
                    AlertasDestinatarios dest = new AlertasDestinatarios();
                    dest.setAlerta(alerta);
                    dest.setUsuario(destinatario);
                    dest.setFechaNotificacion(LocalDateTime.now());
                    destinatarioRepository.save(dest);
                }
            }
        }
    }

    /**
     * Calcula los días hábiles entre dos fechas (excluye sábados, domingos y feriados).
     */
    private long calcularDiasHabiles(LocalDate inicio, LocalDate fin) {
        if (inicio == null || fin == null || inicio.isAfter(fin)) {
            return 0;
        }

        long diasHabiles = 0;
        LocalDate fecha = inicio;

        while (!fecha.isAfter(fin)) {
            DayOfWeek diaSemana = fecha.getDayOfWeek();
            boolean esFinDeSemana = diaSemana == DayOfWeek.SATURDAY || diaSemana == DayOfWeek.SUNDAY;
            boolean esFeriado = calendarioNoLaboralRepository.existsByFecha(fecha);

            if (!esFinDeSemana && !esFeriado) {
                diasHabiles++;
            }
            fecha = fecha.plusDays(1);
        }

        return diasHabiles;
    }
}