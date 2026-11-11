package com.ot.controller;

import com.ot.model.*;
import com.ot.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/entregas")
public class EntregaController {

    private final EntregaRepository entregaRepository;
    private final EntregaDetalleRepository detalleRepository;
    private final OrdenTrabajoRepository ordenRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstadoOTRepository estadoRepository;
    private final HistorialOTRepository historialRepository;
    private final ProgramacionDetalleRepository programacionDetalleRepository;

    public EntregaController(EntregaRepository entregaRepository, EntregaDetalleRepository detalleRepository,
                             OrdenTrabajoRepository ordenRepository,
                             UsuarioRepository usuarioRepository, EstadoOTRepository estadoRepository,
                             HistorialOTRepository historialRepository,
                             ProgramacionDetalleRepository programacionDetalleRepository) {
        this.entregaRepository = entregaRepository;
        this.detalleRepository = detalleRepository;
        this.ordenRepository = ordenRepository;
        this.usuarioRepository = usuarioRepository;
        this.estadoRepository = estadoRepository;
        this.historialRepository = historialRepository;
        this.programacionDetalleRepository = programacionDetalleRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Entrega entrega : entregaRepository.findAllByOrderByFechaEntregaDesc()) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", entrega.getId());
            item.put("fechaEntrega", entrega.getFechaEntrega());
            item.put("entregadoPor", entrega.getEntregadoPor());
            item.put("observacion", entrega.getObservacion());
            item.put("fechaCreacion", entrega.getFechaCreacion());
            item.put("detalles", detalleRepository.findByEntregaId(entrega.getId()));
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return entregaRepository.findById(id)
            .map(e -> {
                Map<String, Object> response = new HashMap<>();
                response.put("entrega", e);
                response.put("detalles", detalleRepository.findByEntregaId(id));
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody EntregaRequest request, Authentication auth) {
        if (request.getDetalles() == null || request.getDetalles().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Debe asignar al menos una OT a un técnico"));
        }

        for (EntregaDetalleRequest detalleReq : request.getDetalles()) {
            OrdenTrabajo orden = ordenRepository.findById(detalleReq.getOrdenId()).orElseThrow();

            if (orden.getEstado() == null || !orden.getEstado().getNombre().equals("PROGRAMADO")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "La OT " + orden.getNumeroOT() + " no está en estado PROGRAMADO"));
            }

            if (detalleRepository.existsByOrdenTrabajoIdAndFechaDevolucionIsNull(orden.getId())) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "La OT " + orden.getNumeroOT() + " ya tiene una entrega pendiente"));
            }

            if (usuarioRepository.findById(detalleReq.getTecnicoId()).isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "Técnico no encontrado"));
            }
        }

        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();
        EstadoOT estadoEntregado = estadoRepository.findByNombre("ENTREGADO").orElseThrow();

        Entrega entrega = new Entrega();
        entrega.setEntregadoPor(usuario);
        entrega.setObservacion(request.getObservacion());
        if (request.getFecha() != null) {
            entrega.setFechaEntrega(request.getFecha());
        }
        entrega = entregaRepository.save(entrega);

        for (EntregaDetalleRequest detalleReq : request.getDetalles()) {
            OrdenTrabajo orden = ordenRepository.findById(detalleReq.getOrdenId()).orElseThrow();
            Usuario tecnico = usuarioRepository.findById(detalleReq.getTecnicoId()).orElseThrow();

            EntregaDetalle detalle = new EntregaDetalle();
            detalle.setEntrega(entrega);
            detalle.setProgramacionDetalle(null);
            detalle.setOrdenTrabajo(orden);
            detalle.setTecnico(tecnico);
            detalleRepository.save(detalle);

            orden.setEstado(estadoEntregado);
            orden.setFechaInicioEstado(LocalDateTime.now());
            orden.setUbicacion("Con técnico " + tecnico.getNombres() + " " + tecnico.getApellidos());
            ordenRepository.save(orden);

            HistorialOT historial = new HistorialOT();
            historial.setOrdenTrabajo(orden);
            historial.setUsuario(usuario);
            historial.setEstadoNuevo(estadoEntregado);
            historial.setEntregaDetalle(detalle);
            historial.setAccion("ENTREGA");
            historial.setObservacion("OT entregada a " + tecnico.getNombres() + " " + tecnico.getApellidos());
            historialRepository.save(historial);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("mensaje", "Entrega registrada exitosamente");
        response.put("entrega", entrega);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/mis-ot")
    public ResponseEntity<List<Map<String, Object>>> getMisOT(Authentication auth) {
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();
        List<EntregaDetalle> detalles = detalleRepository.findByTecnicoId(usuario.getId());

        List<Long> ordenIds = detalles.stream().map(d -> d.getOrdenTrabajo().getId()).toList();
        Map<Long, java.time.LocalDate> fechasProgramacion = new HashMap<>();
        if (!ordenIds.isEmpty()) {
            for (Object[] fila : programacionDetalleRepository.minFechaProgramacionPorOrdenes(ordenIds)) {
                fechasProgramacion.put((Long) fila[0], (java.time.LocalDate) fila[1]);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (EntregaDetalle detalle : detalles) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", detalle.getId());
            item.put("entrega", detalle.getEntrega());
            item.put("programacionDetalle", detalle.getProgramacionDetalle());
            item.put("ordenTrabajo", detalle.getOrdenTrabajo());
            item.put("tecnico", detalle.getTecnico());
            item.put("fechaDevolucion", detalle.getFechaDevolucion());
            item.put("recibidoPor", detalle.getRecibidoPor());
            item.put("observacion", detalle.getObservacion());
            item.put("fechaCreacion", detalle.getFechaCreacion());
            item.put("fechaProgramacion", fechasProgramacion.get(detalle.getOrdenTrabajo().getId()));
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/tecnicos")
    public ResponseEntity<List<Map<String, Object>>> getTecnicosConEntregas() {
        List<EntregaDetalle> detalles = detalleRepository.findAll().stream()
            .filter(d -> d.getTecnico() != null)
            .collect(Collectors.toList());
        Map<Long, Map<String, Object>> tecnicoMap = new HashMap<>();

        for (EntregaDetalle detalle : detalles) {
            Long tecnicoId = detalle.getTecnico().getId();
            String nombreTecnico = detalle.getTecnico().getNombres() + " " + detalle.getTecnico().getApellidos();

            if (!tecnicoMap.containsKey(tecnicoId)) {
                Map<String, Object> info = new HashMap<>();
                info.put("id", tecnicoId);
                info.put("nombre", nombreTecnico);
                info.put("total", 0);
                List<Map<String, Object>> ots = new ArrayList<>();
                info.put("ots", ots);
                tecnicoMap.put(tecnicoId, info);
            }

            Map<String, Object> info = tecnicoMap.get(tecnicoId);
            info.put("total", (Integer) info.get("total") + 1);

            Map<String, Object> otInfo = new HashMap<>();
            otInfo.put("id", detalle.getOrdenTrabajo().getId());
            otInfo.put("numeroOT", detalle.getOrdenTrabajo().getNumeroOT());
            otInfo.put("tipoOT", detalle.getOrdenTrabajo().getTipoOT() != null ? detalle.getOrdenTrabajo().getTipoOT().getNombre() : "");
            otInfo.put("descripcion", detalle.getOrdenTrabajo().getDescripcion());
            otInfo.put("fechaEntrega", detalle.getFechaCreacion());
            otInfo.put("estado", detalle.getOrdenTrabajo().getEstado() != null
                ? detalle.getOrdenTrabajo().getEstado().getNombre() : "");
            otInfo.put("ubicacion", detalle.getOrdenTrabajo().getUbicacion());
            ((List<Map<String, Object>>) info.get("ots")).add(otInfo);
        }

        List<Map<String, Object>> resultado = new ArrayList<>(tecnicoMap.values());
        return ResponseEntity.ok(resultado);
    }

    @PostMapping("/detalle/{id}/solicitar-devolucion")
    public ResponseEntity<?> solicitarDevolucion(@PathVariable Long id, @RequestBody DevolucionRequest request, Authentication auth) {
        EntregaDetalle detalle = detalleRepository.findById(id).orElseThrow();
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();

        if (!detalle.getTecnico().getId().equals(usuario.getId())) {
            Map<String, String> error = new HashMap<>();
            error.put("mensaje", "Solo el técnico asignado puede solicitar la devolución");
            return ResponseEntity.status(403).body(error);
        }

        if (detalle.getFechaDevolucion() != null) {
            Map<String, String> error = new HashMap<>();
            error.put("mensaje", "Esta OT ya fue devuelta");
            return ResponseEntity.badRequest().body(error);
        }

        detalle.setFechaDevolucion(LocalDateTime.now());
        detalle.setObservacion(request.getObservacion());
        detalleRepository.save(detalle);

        OrdenTrabajo orden = detalle.getOrdenTrabajo();
        EstadoOT estadoDevuelto = estadoRepository.findByNombre("DEVUELTO").orElseThrow();
        orden.setEstado(estadoDevuelto);
        orden.setFechaInicioEstado(LocalDateTime.now());
        ordenRepository.save(orden);

        HistorialOT historial = new HistorialOT();
        historial.setOrdenTrabajo(orden);
        historial.setUsuario(usuario);
        historial.setEstadoAnterior(estadoRepository.findByNombre("ENTREGADO").orElseThrow());
        historial.setEstadoNuevo(estadoDevuelto);
        historial.setEntregaDetalle(detalle);
        historial.setAccion("SOLICITUD_DEVOLUCION");
        historial.setObservacion(request.getObservacion());
        historialRepository.save(historial);

        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "Solicitud de devolución registrada");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/detalle/{id}/confirmar-recepcion")
    public ResponseEntity<?> confirmarRecepcion(@PathVariable Long id, @RequestBody DevolucionRequest request, Authentication auth) {
        EntregaDetalle detalle = detalleRepository.findById(id).orElseThrow();
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();

        if (detalle.getRecibidoPor() != null) {
            Map<String, String> error = new HashMap<>();
            error.put("mensaje", "Esta OT ya fue recibida administrativamente");
            return ResponseEntity.badRequest().body(error);
        }

        detalle.setRecibidoPor(usuario);
        detalleRepository.save(detalle);

        OrdenTrabajo orden = detalle.getOrdenTrabajo();
        String ubicacion = request.getUbicacion() != null && !request.getUbicacion().isBlank()
            ? request.getUbicacion().trim() : null;
        if (ubicacion != null) {
            orden.setUbicacion(ubicacion);
            ordenRepository.save(orden);
        }
        String observacionHistorial = request.getObservacion();
        if (ubicacion != null) {
            observacionHistorial = (observacionHistorial != null && !observacionHistorial.isBlank())
                ? observacionHistorial + " · Ubicación: " + ubicacion
                : "Ubicación: " + ubicacion;
        }
        HistorialOT historial = new HistorialOT();
        historial.setOrdenTrabajo(orden);
        historial.setUsuario(usuario);
        historial.setEstadoNuevo(orden.getEstado());
        historial.setEntregaDetalle(detalle);
        historial.setAccion("CONFIRMACION_RECEPCION");
        historial.setObservacion(observacionHistorial);
        historialRepository.save(historial);

        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "Recepción confirmada");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{entregaId}/recepcion")
    @Transactional
    public ResponseEntity<?> recepcion(@PathVariable Long entregaId, @RequestBody RecepcionRequest request, Authentication auth) {
        Entrega entrega = entregaRepository.findById(entregaId).orElseThrow();
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();

        if (request.getDetalleIds() == null || request.getDetalleIds().isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("mensaje", "Debe seleccionar al menos una OT"));
        }

        Map<Long, String> ubicaciones = request.getUbicaciones() != null
            ? request.getUbicaciones() : Map.of();

        EstadoOT estadoDevuelto = estadoRepository.findByNombre("DEVUELTO").orElseThrow();
        EstadoOT estadoEntregado = estadoRepository.findByNombre("ENTREGADO").orElseThrow();

        for (Long detalleId : request.getDetalleIds()) {
            EntregaDetalle detalle = detalleRepository.findById(detalleId).orElseThrow();

            String ubicacion = ubicaciones.get(detalleId);
            if (ubicacion == null || ubicacion.isBlank()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "Debe indicar la ubicación de la OT "
                        + detalle.getOrdenTrabajo().getNumeroOT()));
            }

            if (!detalle.getEntrega().getId().equals(entrega.getId())) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "La OT " + detalle.getOrdenTrabajo().getNumeroOT() + " no pertenece a esta entrega"));
            }

            if (detalle.getRecibidoPor() != null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "La OT " + detalle.getOrdenTrabajo().getNumeroOT() + " ya fue recibida"));
            }

            OrdenTrabajo orden = detalle.getOrdenTrabajo();
            if (orden.getEstado() == null || !orden.getEstado().getNombre().equals("ENTREGADO")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "La OT " + orden.getNumeroOT() + " no está en estado ENTREGADO"));
            }

            LocalDateTime ahora = LocalDateTime.now();
            detalle.setFechaDevolucion(ahora);
            detalle.setRecibidoPor(usuario);
            if (request.getObservacion() != null && !request.getObservacion().isBlank()) {
                detalle.setObservacion(request.getObservacion());
            }
            detalleRepository.save(detalle);

            orden.setEstado(estadoDevuelto);
            orden.setFechaInicioEstado(ahora);
            orden.setUbicacion(ubicacion.trim());
            ordenRepository.save(orden);

            HistorialOT historial = new HistorialOT();
            historial.setOrdenTrabajo(orden);
            historial.setUsuario(usuario);
            historial.setEstadoAnterior(estadoEntregado);
            historial.setEstadoNuevo(estadoDevuelto);
            historial.setEntregaDetalle(detalle);
            historial.setAccion("CONFIRMACION_RECEPCION");
            String observacionHistorial = request.getObservacion() != null
                && !request.getObservacion().isBlank()
                ? request.getObservacion() + " · Ubicación: " + ubicacion.trim()
                : "Ubicación: " + ubicacion.trim();
            historial.setObservacion(observacionHistorial);
            historialRepository.save(historial);
        }

        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "Recepción confirmada para " + request.getDetalleIds().size() + " OT(s)");
        return ResponseEntity.ok(response);
    }

    public static class EntregaRequest {
        private String observacion;
        private LocalDateTime fecha;
        private List<EntregaDetalleRequest> detalles;

        public String getObservacion() { return observacion; }
        public void setObservacion(String observacion) { this.observacion = observacion; }
        public LocalDateTime getFecha() { return fecha; }
        public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
        public List<EntregaDetalleRequest> getDetalles() { return detalles; }
        public void setDetalles(List<EntregaDetalleRequest> detalles) { this.detalles = detalles; }
    }

    public static class EntregaDetalleRequest {
        private Long ordenId;
        private Long tecnicoId;

        public Long getOrdenId() { return ordenId; }
        public void setOrdenId(Long ordenId) { this.ordenId = ordenId; }
        public Long getTecnicoId() { return tecnicoId; }
        public void setTecnicoId(Long tecnicoId) { this.tecnicoId = tecnicoId; }
    }

    public static class DevolucionRequest {
        private String observacion;
        private String ubicacion;

        public String getObservacion() { return observacion; }
        public void setObservacion(String observacion) { this.observacion = observacion; }
        public String getUbicacion() { return ubicacion; }
        public void setUbicacion(String ubicacion) { this.ubicacion = ubicacion; }
    }

    public static class RecepcionRequest {
        private List<Long> detalleIds;
        private String observacion;
        private Map<Long, String> ubicaciones;

        public List<Long> getDetalleIds() { return detalleIds; }
        public void setDetalleIds(List<Long> detalleIds) { this.detalleIds = detalleIds; }
        public String getObservacion() { return observacion; }
        public void setObservacion(String observacion) { this.observacion = observacion; }
        public Map<Long, String> getUbicaciones() { return ubicaciones; }
        public void setUbicaciones(Map<Long, String> ubicaciones) { this.ubicaciones = ubicaciones; }
    }
}