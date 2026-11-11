package com.ot.controller;

import com.ot.model.Usuario;
import com.ot.repository.UsuarioRepository;
import com.ot.security.JwtAuthenticationFilter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final JwtAuthenticationFilter jwtFilter;

    public AuthController(AuthenticationManager authenticationManager, UsuarioRepository usuarioRepository, JwtAuthenticationFilter jwtFilter) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.jwtFilter = jwtFilter;
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

        return ResponseEntity.ok(response);
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
                "ordenes-trabajo", "programaciones", "entregas", "devoluciones",
                "seguimiento", "historial", "reportes");
            case "FACTIBILIZADOR" -> List.of(
                "ordenes-trabajo", "programaciones", "entregas", "devoluciones",
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
}