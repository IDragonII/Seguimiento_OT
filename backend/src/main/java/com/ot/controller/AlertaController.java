package com.ot.controller;

import com.ot.model.AlertasOT;
import com.ot.model.AlertasDestinatarios;
import com.ot.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alertas")

public class AlertaController {

    private final AlertasOTRepository alertaRepository;
    private final AlertasDestinatariosRepository destinatarioRepository;
    private final UsuarioRepository usuarioRepository;

    public AlertaController(AlertasOTRepository alertaRepository, AlertasDestinatariosRepository destinatarioRepository,
                            UsuarioRepository usuarioRepository) {
        this.alertaRepository = alertaRepository;
        this.destinatarioRepository = destinatarioRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping
    public ResponseEntity<List<AlertasOT>> getAll() {
        return ResponseEntity.ok(alertaRepository.findAllByOrderByFechaGeneracionDesc());
    }

    @GetMapping("/mis-alertas")
    public ResponseEntity<List<AlertasDestinatarios>> getMisAlertas(Authentication auth) {
        var usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();
        return ResponseEntity.ok(destinatarioRepository.findByUsuarioIdAndEstadoYFechaLecturaIsNull(usuario.getId()));
    }

    @PatchMapping("/{id}/atender")
    public ResponseEntity<?> atender(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        // Update the alert state
        return alertaRepository.findById(id)
            .map(alerta -> {
                alerta.setEstadoAlerta("ATENDIDA");
                alerta.setFechaResolucion(LocalDateTime.now());
                alerta.setObservacion(body.get("observacion"));
                alertaRepository.save(alerta);

                Map<String, String> response = new HashMap<>();
                response.put("mensaje", "Alerta atendida");
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/descartar")
    public ResponseEntity<?> descartar(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        // Update the alert state
        return alertaRepository.findById(id)
            .map(alerta -> {
                alerta.setEstadoAlerta("DESCARTADA");
                alerta.setFechaResolucion(LocalDateTime.now());
                alerta.setObservacion(body.get("observacion"));
                alertaRepository.save(alerta);

                Map<String, String> response = new HashMap<>();
                response.put("mensaje", "Alerta descartada");
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}