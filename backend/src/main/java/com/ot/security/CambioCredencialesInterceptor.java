package com.ot.security;

import com.ot.config.CredencialesSemilla;
import com.ot.model.Usuario;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class CambioCredencialesInterceptor implements HandlerInterceptor {

    private final PasswordEncoder passwordEncoder;

    public CambioCredencialesInterceptor(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (request.getRequestURI().startsWith("/api/auth/")) {
            return true;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Usuario usuario)) {
            return true;
        }

        if (passwordEncoder.matches(CredencialesSemilla.PASSWORD_ADMIN, usuario.getPasswordHash())) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"codigo\":\"CAMBIO_CREDENCIALES_REQUERIDO\",\"mensaje\":\"Debes cambiar tu nombre, email y contraseña para continuar\"}");
            return false;
        }

        return true;
    }
}
