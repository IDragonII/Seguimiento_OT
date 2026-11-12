package com.ot.config;

import com.ot.security.CambioCredencialesInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final CambioCredencialesInterceptor cambioCredencialesInterceptor;

    public WebMvcConfig(CambioCredencialesInterceptor cambioCredencialesInterceptor) {
        this.cambioCredencialesInterceptor = cambioCredencialesInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(cambioCredencialesInterceptor).addPathPatterns("/api/**");
    }
}
