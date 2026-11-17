package com.ot.repository;

import com.ot.model.CategoriaOT;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoriaOTRepository extends JpaRepository<CategoriaOT, Long> {
    Optional<CategoriaOT> findByNombre(String nombre);
    boolean existsByNombre(String nombre);
}
