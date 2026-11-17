package com.ot.controller;

import com.ot.model.*;
import com.ot.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Objects;

@RestController
@RequestMapping("/api/ordenes-trabajo")
public class OrdenTrabajoController {

    private final OrdenTrabajoRepository ordenRepository;
    private final TipoOTRepository tipoRepository;
    private final EstadoOTRepository estadoRepository;
    private final UsuarioRepository usuarioRepository;
    private final HistorialOTRepository historialRepository;
    private final CategoriaOTRepository categoriaRepository;
    private final MaterialRepository materialRepository;
    private final OrdenMaterialRepository ordenMaterialRepository;

    public OrdenTrabajoController(OrdenTrabajoRepository ordenRepository, TipoOTRepository tipoRepository,
                                  EstadoOTRepository estadoRepository, UsuarioRepository usuarioRepository,
                                  HistorialOTRepository historialRepository, CategoriaOTRepository categoriaRepository,
                                  MaterialRepository materialRepository, OrdenMaterialRepository ordenMaterialRepository) {
        this.ordenRepository = ordenRepository;
        this.tipoRepository = tipoRepository;
        this.estadoRepository = estadoRepository;
        this.usuarioRepository = usuarioRepository;
        this.historialRepository = historialRepository;
        this.categoriaRepository = categoriaRepository;
        this.materialRepository = materialRepository;
        this.ordenMaterialRepository = ordenMaterialRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<OrdenTrabajo>> getAll() {
        List<OrdenTrabajo> ordenes = ordenRepository.findAll();
        // Inicializa los materiales dentro de la transacción (1 SELECT IN por
        // lote de 50 con @BatchSize) para no depender de Open-Session-In-View
        // ni provocar un N+1 al serializar la lista.
        ordenes.forEach(o -> o.getMateriales().size());
        return ResponseEntity.ok(ordenes);
    }

    @GetMapping("/disponibles")
    public ResponseEntity<List<OrdenTrabajo>> getDisponibles() {
        return ResponseEntity.ok(ordenRepository.findDisponibles());
    }

    @GetMapping("/devueltas")
    @Transactional(readOnly = true)
    public ResponseEntity<List<OrdenTrabajo>> getDevueltas() {
        List<OrdenTrabajo> ordenes = ordenRepository.findDevueltas();
        // Igual que en getAll(): inicializa materiales dentro de la transacción.
        ordenes.forEach(o -> o.getMateriales().size());
        return ResponseEntity.ok(ordenes);
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

        String apellidos = request.getApellidosNombre() != null ? request.getApellidosNombre().trim() : "";
        if (apellidos.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("mensaje", "Los apellidos y nombres son obligatorios"));
        }
        if (request.getCategoriaId() == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "La categoría es obligatoria"));
        }
        CategoriaOT categoria = categoriaRepository.findById(request.getCategoriaId())
            .orElse(null);
        if (categoria == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Categoría desconocida"));
        }

        TipoOT tipo = tipoRepository.findById(request.getTipoOTId()).orElseThrow();
        EstadoOT estado = estadoRepository.findByNombre("PROGRAMADO").orElseThrow();
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();

        OrdenTrabajo orden = new OrdenTrabajo();
        orden.setTipoOT(tipo);
        orden.setNumeroOT(request.getNumeroOT());
        orden.setEstado(estado);
        orden.setApellidosNombre(apellidos);
        orden.setDescripcion(request.getDescripcion());
        orden.setCategoria(categoria);
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

            String apellidos = request.getApellidosNombre() != null ? request.getApellidosNombre().trim() : "";
            if (apellidos.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "Los apellidos y nombres son obligatorios"));
            }
            if (request.getCategoriaId() == null) {
                return ResponseEntity.badRequest().body(Map.of("mensaje", "La categoría es obligatoria"));
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

            CategoriaOT categoria = categoriaRepository.findById(request.getCategoriaId()).orElse(null);
            if (categoria == null) {
                return ResponseEntity.badRequest().body(Map.of("mensaje", "Categoría desconocida"));
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

            String apellidosActual = orden.getApellidosNombre() == null ? "" : orden.getApellidosNombre();
            if (!apellidosActual.equals(apellidos)) {
                cambios.add("Apellidos y nombres actualizados");
                orden.setApellidosNombre(apellidos);
            }

            Long categoriaActualId = orden.getCategoria() != null ? orden.getCategoria().getId() : null;
            if (!Objects.equals(categoriaActualId, categoria.getId())) {
                cambios.add("Categoría: "
                    + (orden.getCategoria() != null ? orden.getCategoria().getNombre() : "sin categoría")
                    + " → " + categoria.getNombre());
                orden.setCategoria(categoria);
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

    @PutMapping("/{id}/materiales")
    @PreAuthorize("hasAnyRole('ADMIN','FACTIBILIZADOR')")
    public ResponseEntity<?> setMateriales(@PathVariable Long id,
                                           @RequestBody MaterialesRequest request,
                                           Authentication auth) {
        return ordenRepository.findById(id).map(orden -> {
            List<MaterialAsignacion> items = request != null && request.getMateriales() != null
                ? request.getMateriales() : List.of();

            java.util.Set<Long> vistos = new java.util.HashSet<>();
            List<com.ot.model.Material> materialesResueltos = new ArrayList<>();
            List<java.math.BigDecimal> cantidades = new ArrayList<>();

            for (MaterialAsignacion item : items) {
                if (item.getMaterialId() == null) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("mensaje", "Cada material debe indicar su id"));
                }
                if (item.getCantidad() == null || item.getCantidad().signum() <= 0) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("mensaje", "La cantidad debe ser mayor que cero"));
                }
                if (!vistos.add(item.getMaterialId())) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("mensaje", "Material duplicado en la lista"));
                }
                com.ot.model.Material material = materialRepository.findById(item.getMaterialId()).orElse(null);
                if (material == null) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("mensaje", "Material desconocido (id " + item.getMaterialId() + ")"));
                }
                if (!Boolean.TRUE.equals(material.getActivo())) {
                    return ResponseEntity.badRequest()
                        .body(Map.of("mensaje", "El material '" + material.getNombre() + "' está inactivo"));
                }
                materialesResueltos.add(material);
                cantidades.add(item.getCantidad());
            }

            ordenMaterialRepository.deleteByOrdenTrabajoId(orden.getId());
            for (int i = 0; i < materialesResueltos.size(); i++) {
                com.ot.model.OrdenMaterial om = new com.ot.model.OrdenMaterial();
                om.setOrdenTrabajo(orden);
                om.setMaterial(materialesResueltos.get(i));
                om.setCantidad(cantidades.get(i));
                ordenMaterialRepository.save(om);
            }

            HistorialOT historial = new HistorialOT();
            historial.setOrdenTrabajo(orden);
            historial.setUsuario(usuarioRepository.findByEmail(auth.getName()).orElseThrow());
            historial.setEstadoNuevo(orden.getEstado());
            historial.setAccion("MATERIALES");
            historial.setObservacion("Materiales de la OT actualizados (" + items.size() + " ítems)");
            historialRepository.save(historial);

            return ResponseEntity.ok(ordenRepository.findById(id).orElse(orden));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Paso del INSTALADOR: una OT devuelta por el técnico vuelve a estado
     * PROGRAMADO para que pueda entregarse de nuevo (queda lista para
     * ejecución). No fija fecha: la programación es el estado del flujo.
     */
    @PutMapping("/{id}/programar-ejecucion")
    @PreAuthorize("hasAnyRole('ADMIN','INSTALADOR')")
    @Transactional
    public ResponseEntity<?> programarEjecucion(@PathVariable Long id,
                                                @RequestBody(required = false) ProgramacionEjecucionRequest request,
                                                Authentication auth) {
        OrdenTrabajo orden = ordenRepository.findById(id).orElse(null);
        if (orden == null) {
            return ResponseEntity.notFound().build();
        }

        EstadoOT estadoAnterior = orden.getEstado();
        if (estadoAnterior == null || !"DEVUELTO".equals(estadoAnterior.getNombre())) {
            return ResponseEntity.badRequest()
                .body(Map.of("mensaje", "Solo se pueden programar OT en estado DEVUELTO"));
        }

        EstadoOT estadoProgramado = estadoRepository.findByNombre("PROGRAMADO").orElseThrow();
        orden.setEstado(estadoProgramado);
        orden.setFechaInicioEstado(LocalDateTime.now());
        OrdenTrabajo saved = ordenRepository.save(orden);

        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();
        String observacion = request != null ? request.getObservacion() : null;
        HistorialOT historial = new HistorialOT();
        historial.setOrdenTrabajo(saved);
        historial.setUsuario(usuario);
        historial.setEstadoAnterior(estadoAnterior);
        historial.setEstadoNuevo(estadoProgramado);
        historial.setAccion("PROGRAMACION_EJECUCION");
        historial.setObservacion(observacion != null && !observacion.isBlank()
            ? observacion.trim() : "OT programada para ejecución");
        historialRepository.save(historial);

        return ResponseEntity.ok(ordenRepository.findById(id).orElse(saved));
    }

    @GetMapping("/mis-historial")
    public ResponseEntity<List<HistorialOT>> getMisHistorial(Authentication auth) {
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElseThrow();
        return ResponseEntity.ok(historialRepository.findByOrdenesDeTecnico(usuario.getId()));
    }

    public static class OrdenTrabajoRequest {
        private Long tipoOTId;
        private Integer numeroOT;
        private String apellidosNombre;
        private String descripcion;
        private Long categoriaId;

        public Long getTipoOTId() { return tipoOTId; }
        public void setTipoOTId(Long tipoOTId) { this.tipoOTId = tipoOTId; }
        public Integer getNumeroOT() { return numeroOT; }
        public void setNumeroOT(Integer numeroOT) { this.numeroOT = numeroOT; }
        public String getApellidosNombre() { return apellidosNombre; }
        public void setApellidosNombre(String apellidosNombre) { this.apellidosNombre = apellidosNombre; }
        public String getDescripcion() { return descripcion; }
        public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
        public Long getCategoriaId() { return categoriaId; }
        public void setCategoriaId(Long categoriaId) { this.categoriaId = categoriaId; }
    }

    public static class MaterialesRequest {
        private List<MaterialAsignacion> materiales;

        public List<MaterialAsignacion> getMateriales() { return materiales; }
        public void setMateriales(List<MaterialAsignacion> materiales) { this.materiales = materiales; }
    }

    public static class ProgramacionEjecucionRequest {
        private String observacion;

        public String getObservacion() { return observacion; }
        public void setObservacion(String observacion) { this.observacion = observacion; }
    }

    public static class MaterialAsignacion {
        private Long materialId;
        private java.math.BigDecimal cantidad;

        public Long getMaterialId() { return materialId; }
        public void setMaterialId(Long materialId) { this.materialId = materialId; }
        public java.math.BigDecimal getCantidad() { return cantidad; }
        public void setCantidad(java.math.BigDecimal cantidad) { this.cantidad = cantidad; }
    }
}