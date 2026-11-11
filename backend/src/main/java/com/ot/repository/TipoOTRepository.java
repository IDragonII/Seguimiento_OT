package com.ot.repository;

import com.ot.model.TipoOT;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TipoOTRepository extends JpaRepository<TipoOT, Long> {
    Optional<TipoOT> findByNombre(String nombre);
}