package com.ot.controller;

import com.ot.model.ConfiguracionTiemposOT;
import com.ot.repository.ConfiguracionTiemposOTRepository;
import com.ot.repository.EstadoOTRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/configuracion")
public class ConfiguracionController {

    private final ConfiguracionTiemposOTRepository configuracionRepository;
    private final EstadoOTRepository estadoRepository;

    public ConfiguracionController(ConfiguracionTiemposOTRepository configuracionRepository, EstadoOTRepository estadoRepository) {
        this.configuracionRepository = configuracionRepository;
        this.estadoRepository = estadoRepository;
    }

    @GetMapping("/tiempos-ot")
    public ResponseEntity<List<ConfiguracionTiemposOT>> getTiempos() {
        return ResponseEntity.ok(configuracionRepository.findAll());
    }

    @PutMapping("/tiempos-ot/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateTiempo(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        return configuracionRepository.findById(id)
            .map(config -> {
                config.setDiasHabilesMaximos(body.get("diasHabilesMaximos"));
                return ResponseEntity.ok(configuracionRepository.save(config));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/tiempos-ot/{id}/limite")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> actualizarLimite(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Boolean activo = body.get("activo");
        if (activo == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Debe indicar el valor de activo"));
        }
        return configuracionRepository.findById(id)
            .map(config -> {
                config.setActivo(activo);
                return ResponseEntity.ok(configuracionRepository.save(config));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tiempos-ot")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createTiempo(@RequestBody Map<String, Object> body) {
        Long estadoId = Long.valueOf(body.get("estadoId").toString());
        Integer dias = Integer.valueOf(body.get("diasHabilesMaximos").toString());

        var estado = estadoRepository.findById(estadoId).orElseThrow();
        var existente = configuracionRepository.findByEstadoId(estadoId);

        if (existente.isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("mensaje", "Ya existe configuración para este estado");
            return ResponseEntity.badRequest().body(error);
        }

        ConfiguracionTiemposOT config = new ConfiguracionTiemposOT();
        config.setEstado(estado);
        config.setDiasHabilesMaximos(dias);

        return ResponseEntity.ok(configuracionRepository.save(config));
    }
}