package com.ot.controller;

import com.ot.model.*;
import com.ot.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/ordenes-trabajo")
public class OrdenTrabajoController {

    private final OrdenTrabajoRepository ordenRepository;
    private final TipoOTRepository tipoRepository;
    private final EstadoOTRepository estadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final HistorialOTRepository historialRepository;

    public OrdenTrabajoController(OrdenTrabajoRepository ordenRepository, TipoOTRepository tipoRepository,
                                  EstadoOTRepository estadoRepository, UsuarioRepository usuarioRepository,
                                  HistorialOTRepository historialRepository) {
        this.ordenRepository = ordenRepository;
        this.tipoRepository = tipoRepository;
        this.estadoRepository = estadoRepository;
        this.usuarioRepository = usuarioRepository;
        this.historialRepository = historialRepository;
    }

    @GetMapping
    public ResponseEntity<List<OrdenTrabajo>> getAll() {
        return ResponseEntity.ok(ordenRepository.findAll());
    }

    @GetMapping("/disponibles")
    public ResponseEntity<List<OrdenTrabajo>> getDisponibles() {
        return ResponseEntity.ok(ordenRepository.findDisponibles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrdenTrabajo> getById(@PathVariable Long id) {
        return ordenRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','FACTIBILIZADOR')")
    public ResponseEntity<?> create(@RequestBody OrdenTrabajoRequest request, Authentication auth) {
        if (ordenRepository.existsByTipoOT_IdAndNumeroOT(request.getTipoOTId(), request.getNumeroOT())) {
            Map<String, String> error = new HashMap<>();
            error.put("mensaje", "Ya existe una OT con este tipo y número");
            return ResponseEntity.badRequest().body(error);
        }

        TipoOT tipo = tipoRepository.findById(request.getTipoOTId()).orElseThrow();
        EstadoOT estado = estadoRepository.findByNombre("PROGRAMADO").orElseThrow();
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();

        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setTipoOT(tipo);
        orden.setNumeroOT(request.getNumeroOT());
        orden.setEstado(estado);
        orden.setDescripcion(request.getDescripcion());
        orden.setUbicacion("Por entregar");
        orden.setRegistradoPor(usuario);

        OrdenTrabajo saved = ordenRepository.save(orden);

        HistorialOT historial = new HistorialOT();
        historial.setOrdenTrabajo(saved);
        historial.setUsuario(usuario);
        historial.setEstadoNuevo(estado);
        historial.setAccion("REGISTRO");
        historial.setObservacion("OT registrada");
        historialRepository.save(historial);

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FACTIBILIZADOR')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody OrdenTrabajoRequest request,
                                    Authentication auth) {
        return ordenRepository.findById(id).map(orden -> {
            if (request.getTipoOTId() == null || request.getNumeroOT() == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "El tipo y el número de OT son obligatorios"));
            }

            boolean mismoPar = orden.getTipoOT().getId().equals(request.getTipoOTId())
                && orden.getNumeroOT().equals(request.getNumeroOT());
            if (!mismoPar && ordenRepository.existsByTipoOT_IdAndNumeroOT(request.getTipoOTId(), request.getNumeroOT())) {
                Map<String, String> error = new HashMap<>();
                error.put("mensaje", "Ya existe una OT con este tipo y número");
                return ResponseEntity.badRequest().body(error);
            }

            TipoOT tipo = tipoRepository.findById(request.getTipoOTId()).orElse(null);
            if (tipo == null) {
                return ResponseEntity.badRequest().body(Map.of("mensaje", "Tipo de OT desconocido"));
            }

            List<String> cambios = new ArrayList<>();

            if (!orden.getTipoOT().getId().equals(tipo.getId())) {
                cambios.add("Tipo: " + orden.getTipoOT().getNombre() + " → " + tipo.getNombre());
                orden.setTipoOT(tipo);
            }

            if (!orden.getNumeroOT().equals(request.getNumeroOT())) {
                cambios.add("Número: #" + orden.getNumeroOT() + " → #" + request.getNumeroOT());
                orden.setNumeroOT(request.getNumeroOT());
            }

            String descActual = orden.getDescripcion() == null ? "" : orden.getDescripcion();
            String descNueva = request.getDescripcion() == null ? "" : request.getDescripcion().trim();
            if (!descActual.equals(descNueva)) {
                cambios.add("Descripción actualizada");
                orden.setDescripcion(descNueva.isEmpty() ? null : descNueva);
            }

            if (cambios.isEmpty()) {
                return ResponseEntity.ok(orden);
            }

            OrdenTrabajo saved = ordenRepository.save(orden);

            Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();
            HistorialOT historial = new HistorialOT();
            historial.setOrdenTrabajo(saved);
            historial.setUsuario(usuario);
            historial.setEstadoNuevo(saved.getEstado());
            historial.setAccion("EDICION");
            historial.setObservacion("Edición: " + String.join(", ", cambios));
            historialRepository.save(historial);

            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/historial")
    public ResponseEntity<List<HistorialOT>> getHistorial(@PathVariable Long id) {
        return ResponseEntity.ok(historialRepository.findByOrdenTrabajoIdOrderByFechaDesc(id));
    }

    @GetMapping("/mis-historial")
    public ResponseEntity<List<HistorialOT>> getMisHistorial(Authentication auth) {
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();
        return ResponseEntity.ok(historialRepository.findByOrdenesDeTecnico(usuario.getId()));
    }

    public static class OrdenTrabajoRequest {
        private Long tipoOTId;
        private Integer numeroOT;
        private String descripcion;

        public Long getTipoOTId() { return tipoOTId; }
        public void setTipoOTId(Long tipoOTId) { this.tipoOTId = tipoOTId; }
        public Integer getNumeroOT() { return numeroOT; }
        public void setNumeroOT(Integer numeroOT) { this.numeroOT = numeroOT; }
        public String getDescripcion() { return descripcion; }
        public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    }
}