package com.ot.repository;

import com.ot.model.ConfiguracionTiemposOT;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConfiguracionTiemposOTRepository extends JpaRepository<ConfiguracionTiemposOT, Long> {
    Optional<ConfiguracionTiemposOT> findByEstadoId(Long estadoId);
    Optional<ConfiguracionTiemposOT> findByEstadoNombre(String nombre);
}