package com.ot.controller;

import com.ot.model.*;
import com.ot.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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

    @GetMapping("/{id}/historial")
    public ResponseEntity<List<HistorialOT>> getHistorial(@PathVariable Long id) {
        return ResponseEntity.ok(historialRepository.findByOrdenTrabajoIdOrderByFechaDesc(id));
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