package com.ot.controller;

import com.ot.model.*;
import com.ot.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/programaciones")
public class ProgramacionController {

    private final ProgramacionRepository programacionRepository;
    private final ProgramacionDetalleRepository detalleRepository;
    private final OrdenTrabajoRepository ordenRepository;
    private final UsuarioRepository usuarioRepository;
    private final EntregaDetalleRepository entregaDetalleRepository;

    public ProgramacionController(ProgramacionRepository programacionRepository,
                                   ProgramacionDetalleRepository detalleRepository,
                                   OrdenTrabajoRepository ordenRepository,
                                   UsuarioRepository usuarioRepository,
                                   EntregaDetalleRepository entregaDetalleRepository) {
        this.programacionRepository = programacionRepository;
        this.detalleRepository = detalleRepository;
        this.ordenRepository = ordenRepository;
        this.usuarioRepository = usuarioRepository;
        this.entregaDetalleRepository = entregaDetalleRepository;
    }

    @GetMapping
    public ResponseEntity<List<Programacion>> getAll() {
        return ResponseEntity.ok(programacionRepository.findAllByOrderByFechaProgramacionDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return programacionRepository.findById(id)
            .map(p -> {
                Map<String, Object> response = new HashMap<>();
                response.put("programacion", p);
                List<Map<String, Object>> detalles = detalleRepository.findByProgramacionId(id).stream()
                    .map(d -> {
                        Map<String, Object> item = new HashMap<>();
                        item.put("id", d.getId());
                        item.put("ordenTrabajo", d.getOrdenTrabajo());
                        item.put("observacion", d.getObservacion());
                        item.put("fechaCreacion", d.getFechaCreacion());
                        item.put("entregada", entregaDetalleRepository.existsByProgramacionDetalleId(d.getId()));
                        return item;
                    })
                    .toList();
                response.put("detalles", detalles);
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Programacion> create(@RequestBody ProgramacionRequest request, Authentication auth) {
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();

        Programacion programacion = new Programacion();
        programacion.setFechaProgramacion(request.getFechaProgramacion());
        programacion.setProgramadoPor(usuario);
        programacion.setObservacion(request.getObservacion());

        return ResponseEntity.ok(programacionRepository.save(programacion));
    }

    @PostMapping("/{id}/ordenes")
    public ResponseEntity<?> addOrdenes(@PathVariable Long id, @RequestBody AddOrdenesRequest request, Authentication auth) {
        Programacion programacion = programacionRepository.findById(id).orElseThrow();
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();

        for (Long ordenId : request.getOrdenIds()) {
            OrdenTrabajo orden = ordenRepository.findById(ordenId).orElseThrow();

            if (detalleRepository.existsByProgramacionIdAndOrdenTrabajoId(id, ordenId)) {
                Map<String, String> error = new HashMap<>();
                error.put("mensaje", "La OT " + ordenId + " ya está en esta programación");
                return ResponseEntity.badRequest().body(error);
            }

            ProgramacionDetalle detalle = new ProgramacionDetalle();
            detalle.setProgramacion(programacion);
            detalle.setOrdenTrabajo(orden);
            detalleRepository.save(detalle);
        }

        Map<String, String> response = new HashMap<>();
        response.put("mensaje", "Órdenes agregadas exitosamente");
        return ResponseEntity.ok(response);
    }

    public static class ProgramacionRequest {
        private LocalDate fechaProgramacion;
        private String observacion;

        public LocalDate getFechaProgramacion() { return fechaProgramacion; }
        public void setFechaProgramacion(LocalDate fechaProgramacion) { this.fechaProgramacion = fechaProgramacion; }
        public String getObservacion() { return observacion; }
        public void setObservacion(String observacion) { this.observacion = observacion; }
    }

    public static class AddOrdenesRequest {
        private List<Long> ordenIds;

        public List<Long> getOrdenIds() { return ordenIds; }
        public void setOrdenIds(List<Long> ordenIds) { this.ordenIds = ordenIds; }
    }
}