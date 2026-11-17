package com.ot.controller;

import com.ot.model.CategoriaOT;
import com.ot.model.EstadoOT;
import com.ot.model.TipoOT;
import com.ot.repository.CategoriaOTRepository;
import com.ot.repository.EstadoOTRepository;
import com.ot.repository.TipoOTRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CatalogoController {

    private final TipoOTRepository tipoOTRepository;
    private final EstadoOTRepository estadoOTRepository;
    private final CategoriaOTRepository categoriaRepository;

    public CatalogoController(TipoOTRepository tipoOTRepository, EstadoOTRepository estadoOTRepository,
                              CategoriaOTRepository categoriaRepository) {
        this.tipoOTRepository = tipoOTRepository;
        this.estadoOTRepository = estadoOTRepository;
        this.categoriaRepository = categoriaRepository;
    }

    @GetMapping("/tipos-ot")
    public ResponseEntity<List<TipoOT>> getTipos() {
        return ResponseEntity.ok(tipoOTRepository.findAll());
    }

    @GetMapping("/estados")
    public ResponseEntity<List<EstadoOT>> getEstados() {
        return ResponseEntity.ok(estadoOTRepository.findAll());
    }

    @GetMapping("/categorias")
    public ResponseEntity<List<CategoriaOT>> getCategorias() {
        return ResponseEntity.ok(categoriaRepository.findAll());
    }

    @PostMapping("/categorias")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createCategoria(@RequestBody Map<String, String> body) {
        String nombre = body.get("nombre") != null ? body.get("nombre").trim() : "";
        if (nombre.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El nombre es obligatorio"));
        }
        if (categoriaRepository.existsByNombre(nombre)) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Ya existe una categoría con ese nombre"));
        }
        CategoriaOT categoria = new CategoriaOT();
        categoria.setNombre(nombre);
        return ResponseEntity.ok(categoriaRepository.save(categoria));
    }

    @PutMapping("/categorias/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateCategoria(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String nombre = body.get("nombre") != null ? body.get("nombre").trim() : "";
        if (nombre.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El nombre es obligatorio"));
        }
        return categoriaRepository.findById(id).map(categoria -> {
            if (categoriaRepository.existsByNombre(nombre) && !categoria.getNombre().equals(nombre)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "Ya existe una categoría con ese nombre"));
            }
            categoria.setNombre(nombre);
            return ResponseEntity.ok(categoriaRepository.save(categoria));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/categorias/{id}/activo")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activarCategoria(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Boolean activo = body.get("activo");
        if (activo == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Debe indicar el valor de activo"));
        }
        return categoriaRepository.findById(id).map(categoria -> {
            categoria.setActivo(activo);
            return ResponseEntity.ok(categoriaRepository.save(categoria));
        }).orElse(ResponseEntity.notFound().build());
    }
}
