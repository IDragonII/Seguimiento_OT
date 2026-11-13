package com.ot.controller;

import com.ot.config.CredencialesSemilla;
import com.ot.model.Usuario;
import com.ot.repository.UsuarioRepository;
import com.ot.security.JwtAuthenticationFilter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final JwtAuthenticationFilter jwtFilter;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authenticationManager, UsuarioRepository usuarioRepository, JwtAuthenticationFilter jwtFilter, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.jwtFilter = jwtFilter;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(auth);
            String token = jwtFilter.generateToken(request.getEmail());

            Usuario usuario = usuarioRepository.findByEmail(request.getEmail()).orElseThrow();

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("tipo", "Bearer");
            response.put("usuario", Map.of(
                "id", usuario.getId(),
                "nombres", usuario.getNombres(),
                "apellidos", usuario.getApellidos(),
                "email", usuario.getEmail(),
                "rol", usuario.getRol().getNombre()
            ));
            response.put("modulos", modulosPorRol(usuario.getRol().getNombre()));
            response.put("debeCambiarCredenciales", credencialesDeSemilla(usuario));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("mensaje", "Credenciales inválidas");
            return ResponseEntity.status(401).body(error);
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        Usuario usuario = usuarioRepository.findByEmail(email).orElseThrow();

        Map<String, Object> response = new HashMap<>();
        response.put("id", usuario.getId());
        response.put("nombres", usuario.getNombres());
        response.put("apellidos", usuario.getApellidos());
        response.put("email", usuario.getEmail());
        response.put("rol", usuario.getRol().getNombre());
        response.put("modulos", modulosPorRol(usuario.getRol().getNombre()));
        response.put("debeCambiarCredenciales", credencialesDeSemilla(usuario));

        return ResponseEntity.ok(response);
    }

    @PutMapping("/cambio-inicial")
    public ResponseEntity<?> cambioInicial(@RequestBody CambioInicialRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Usuario usuario)) {
            Map<String, String> error = new HashMap<>();
            error.put("mensaje", "No autenticado");
            return ResponseEntity.status(401).body(error);
        }

        if (!credencialesDeSemilla(usuario)) {
            Map<String, String> error = new HashMap<>();
            error.put("mensaje", "Las credenciales ya fueron cambiadas");
            return ResponseEntity.badRequest().body(error);
        }

        String nombres = request.getNombres() == null ? "" : request.getNombres().trim();
        String apellidos = request.getApellidos() == null ? "" : request.getApellidos().trim();
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String nuevaPassword = request.getNuevaPassword() == null ? "" : request.getNuevaPassword();

        Map<String, String> error = new HashMap<>();

        if (nombres.isEmpty() || apellidos.isEmpty()) {
            error.put("mensaje", "Nombres y apellidos son obligatorios");
            return ResponseEntity.badRequest().body(error);
        }

        if (!email.matches("^[\\w.+-]+@[\\w-]+\\.[\\w.-]+$")) {
            error.put("mensaje", "El email no tiene un formato válido");
            return ResponseEntity.badRequest().body(error);
        }

        boolean emailLibre = usuarioRepository.findByEmail(email)
            .map(dueno -> dueno.getId().equals(usuario.getId()))
            .orElse(true);
        if (!emailLibre) {
            error.put("mensaje", "Ya existe un usuario con este email");
            return ResponseEntity.badRequest().body(error);
        }

        if (nuevaPassword.length() < 8
                || !nuevaPassword.matches(".*[A-Z].*")
                || !nuevaPassword.matches(".*\\d.*")) {
            error.put("mensaje", "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número");
            return ResponseEntity.badRequest().body(error);
        }

        if (passwordEncoder.matches(nuevaPassword, usuario.getPasswordHash())) {
            error.put("mensaje", "La contraseña nueva debe ser distinta a la anterior");
            return ResponseEntity.badRequest().body(error);
        }

        usuario.setNombres(nombres);
        usuario.setApellidos(apellidos);
        usuario.setEmail(email);
        usuario.setPasswordHash(passwordEncoder.encode(nuevaPassword));
        usuario.setFechaActualizacion(LocalDateTime.now());
        usuarioRepository.save(usuario);

        String token = jwtFilter.generateToken(usuario.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("tipo", "Bearer");
        response.put("usuario", Map.of(
            "id", usuario.getId(),
            "nombres", usuario.getNombres(),
            "apellidos", usuario.getApellidos(),
            "email", usuario.getEmail(),
            "rol", usuario.getRol().getNombre()
        ));
        response.put("modulos", modulosPorRol(usuario.getRol().getNombre()));
        response.put("debeCambiarCredenciales", false);

        return ResponseEntity.ok(response);
    }

    private boolean credencialesDeSemilla(Usuario usuario) {
        return passwordEncoder.matches(CredencialesSemilla.PASSWORD_ADMIN, usuario.getPasswordHash());
    }

    /**
     * Módulos del Panel de trabajo permitidos para cada rol.
     * El frontend solo pinta las tarjetas cuyo key aparece aquí.
     * ADMIN no usa el panel (lista vacía).
     */
    private List<String> modulosPorRol(String rol) {
        return switch (rol) {
            case "TECNICO" -> List.of(
                "mis-ordenes", "mis-devoluciones", "mi-historial");
            case "CONSULTOR" -> List.of(
                "ordenes-trabajo", "entregas", "devoluciones",
                "seguimiento", "historial", "reportes");
            case "FACTIBILIZADOR" -> List.of(
                "ordenes-trabajo", "entregas", "devoluciones",
                "revision", "seguimiento", "historial", "alertas", "reportes");
            default -> List.of();
        };
    }

    public static class LoginRequest {
        private String email;
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class CambioInicialRequest {
        private String nombres;
        private String apellidos;
        private String email;
        private String nuevaPassword;

        public String getNombres() { return nombres; }
        public void setNombres(String nombres) { this.nombres = nombres; }
        public String getApellidos() { return apellidos; }
        public void setApellidos(String apellidos) { this.apellidos = apellidos; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getNuevaPassword() { return nuevaPassword; }
        public void setNuevaPassword(String nuevaPassword) { this.nuevaPassword = nuevaPassword; }
    }
}