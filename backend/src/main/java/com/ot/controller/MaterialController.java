package com.ot.controller;

import com.ot.model.Material;
import com.ot.repository.MaterialRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/materiales")
public class MaterialController {

    private final MaterialRepository materialRepository;

    public MaterialController(MaterialRepository materialRepository) {
        this.materialRepository = materialRepository;
    }

    @GetMapping
    public ResponseEntity<List<Material>> getAll() {
        return ResponseEntity.ok(materialRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        String nombre = body.get("nombre") != null ? body.get("nombre").trim() : "";
        if (nombre.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El nombre es obligatorio"));
        }
        if (materialRepository.existsByNombre(nombre)) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Ya existe un material con ese nombre"));
        }
        Material material = new Material();
        material.setNombre(nombre);
        String unidad = body.get("unidadMedida");
        material.setUnidadMedida(unidad != null && !unidad.trim().isEmpty() ? unidad.trim() : null);
        return ResponseEntity.ok(materialRepository.save(material));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String nombre = body.get("nombre") != null ? body.get("nombre").trim() : "";
        if (nombre.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El nombre es obligatorio"));
        }
        return materialRepository.findById(id).map(material -> {
            if (materialRepository.existsByNombre(nombre) && !material.getNombre().equals(nombre)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "Ya existe un material con ese nombre"));
            }
            material.setNombre(nombre);
            String unidad = body.get("unidadMedida");
            material.setUnidadMedida(unidad != null && !unidad.trim().isEmpty() ? unidad.trim() : null);
            return ResponseEntity.ok(materialRepository.save(material));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/activo")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activar(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Boolean activo = body.get("activo");
        if (activo == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Debe indicar el valor de activo"));
        }
        return materialRepository.findById(id).map(material -> {
            material.setActivo(activo);
            return ResponseEntity.ok(materialRepository.save(material));
        }).orElse(ResponseEntity.notFound().build());
    }
}
