package com.ot.repository;

import com.ot.model.HistorialOT;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistorialOTRepository extends JpaRepository<HistorialOT, Long> {
    List<HistorialOT> findByOrdenTrabajoIdOrderByFechaDesc(Long ordenTrabajoId);
    List<HistorialOT> findByUsuarioIdOrderByFechaDesc(Long usuarioId);
}