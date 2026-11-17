package com.ot.security;

import com.ot.model.Usuario;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class CambioCredencialesInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (request.getRequestURI().startsWith("/api/auth/")) {
            return true;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Usuario usuario)) {
            return true;
        }

        // Solo lee el flag en memoria (ya cargado por JwtAuthenticationFilter).
        // Sin BCrypt por request: cuesta ~100-400 ms de CPU en cada llamada.
        // El flag se pone al crear el usuario, al resetear su contraseña o con
        // el backfill one-shot de la semilla (ver AGENTS.md).
        if (Boolean.TRUE.equals(usuario.getDebeCambiarCredenciales())) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"codigo\":\"CAMBIO_CREDENCIALES_REQUERIDO\",\"mensaje\":\"Debes cambiar tu nombre, email y contraseña para continuar\"}");
            return false;
        }

        return true;
    }
}
