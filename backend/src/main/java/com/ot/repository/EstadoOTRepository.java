package com.ot.repository;

import com.ot.model.EstadoOT;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EstadoOTRepository extends JpaRepository<EstadoOT, Long> {
    Optional<EstadoOT> findByNombre(String nombre);
}