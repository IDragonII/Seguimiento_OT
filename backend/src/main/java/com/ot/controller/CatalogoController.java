package com.ot.controller;

import com.ot.model.EstadoOT;
import com.ot.model.TipoOT;
import com.ot.repository.EstadoOTRepository;
import com.ot.repository.TipoOTRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CatalogoController {

    private final TipoOTRepository tipoOTRepository;
    private final EstadoOTRepository estadoOTRepository;

    public CatalogoController(TipoOTRepository tipoOTRepository, EstadoOTRepository estadoOTRepository) {
        this.tipoOTRepository = tipoOTRepository;
        this.estadoOTRepository = estadoOTRepository;
    }

    @GetMapping("/tipos-ot")
    public ResponseEntity<List<TipoOT>> getTipos() {
        return ResponseEntity.ok(tipoOTRepository.findAll());
    }

    @GetMapping("/estados")
    public ResponseEntity<List<EstadoOT>> getEstados() {
        return ResponseEntity.ok(estadoOTRepository.findAll());
    }
}
