package com.ot.controller;

import com.ot.model.Rol;
import com.ot.model.Usuario;
import com.ot.repository.UsuarioRepository;
import com.ot.repository.RolRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(UsuarioRepository usuarioRepository, RolRepository rolRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/tecnicos")
    @PreAuthorize("hasAnyRole('ADMIN','FACTIBILIZADOR')")
    public ResponseEntity<List<Usuario>> getTecnicos() {
        return ResponseEntity.ok(usuarioRepository.findByRolNombre("TECNICO"));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Usuario>> getAll() {
        return ResponseEntity.ok(usuarioRepository.findAll());
    }

    @GetMapping("/conteo")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Long> getConteo() {
        return ResponseEntity.ok(usuarioRepository.count());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Usuario> getById(@PathVariable Long id) {
        return usuarioRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody UsuarioRequest request) {
        if (usuarioRepository.findByEmail(request.getEmail()).isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("mensaje", "Ya existe un usuario con este email");
            return ResponseEntity.badRequest().body(error);
        }

        var rolOpt = buscarRol(request);
        if (rolOpt.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("mensaje", request.getRol() != null && !request.getRol().isBlank()
                ? "Rol desconocido: " + request.getRol()
                : "Debe indicar el rol");
            return ResponseEntity.badRequest().body(error);
        }

        Usuario usuario = new Usuario();
        usuario.setNombres(request.getNombres());
        usuario.setApellidos(request.getApellidos());
        usuario.setEmail(request.getEmail());
        usuario.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        usuario.setRol(rolOpt.get());
        usuario.setDebeCambiarCredenciales(true);

        return ResponseEntity.ok(usuarioRepository.save(usuario));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UsuarioRequest request) {
        return usuarioRepository.findById(id)
            .map(usuario -> {
                usuario.setNombres(request.getNombres());
                usuario.setApellidos(request.getApellidos());
                usuario.setEmail(request.getEmail());

                if (request.getPassword() != null && !request.getPassword().isEmpty()) {
                    usuario.setPasswordHash(passwordEncoder.encode(request.getPassword()));
                    usuario.setDebeCambiarCredenciales(true);
                }

                if (request.getRol() != null && !request.getRol().isBlank()) {
                    var opt = rolRepository.findByNombre(request.getRol().trim().toUpperCase());
                    if (opt.isEmpty()) {
                        return ResponseEntity.badRequest()
                            .body(Map.of("mensaje", "Rol desconocido: " + request.getRol()));
                    }
                    usuario.setRol(opt.get());
                } else if (request.getRolId() != null) {
                    var rol = rolRepository.findById(request.getRolId()).orElseThrow();
                    usuario.setRol(rol);
                }

                return ResponseEntity.ok(usuarioRepository.save(usuario));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return usuarioRepository.findById(id)
            .map(usuario -> {
                usuario.setActivo(body.get("activo"));
                return ResponseEntity.ok(usuarioRepository.save(usuario));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Resuelve el rol por nombre (preferido) o por id (compat con la API
     * antigua). El frontend envía el nombre porque los ids de la tabla
     * `roles` no son deterministas (DataSeeder usa Map.of).
     */
    private java.util.Optional<Rol> buscarRol(UsuarioRequest request) {
        if (request.getRol() != null && !request.getRol().isBlank()) {
            return rolRepository.findByNombre(request.getRol().trim().toUpperCase());
        }
        if (request.getRolId() != null) {
            return rolRepository.findById(request.getRolId());
        }
        return java.util.Optional.empty();
    }

    public static class UsuarioRequest {
        private String nombres;
        private String apellidos;
        private String email;
        private String password;
        private String rol;
        private Long rolId;

        public String getNombres() { return nombres; }
        public void setNombres(String nombres) { this.nombres = nombres; }
        public String getApellidos() { return apellidos; }
        public void setApellidos(String apellidos) { this.apellidos = apellidos; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getRol() { return rol; }
        public void setRol(String rol) { this.rol = rol; }
        public Long getRolId() { return rolId; }
        public void setRolId(Long rolId) { this.rolId = rolId; }
    }
}