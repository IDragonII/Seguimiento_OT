package com.ot.repository;

import com.ot.model.Entrega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EntregaRepository extends JpaRepository<Entrega, Long> {
    List<Entrega> findAllByOrderByFechaEntregaDesc();
    List<Entrega> findByFechaEntregaBetween(LocalDateTime inicio, LocalDateTime fin);
}