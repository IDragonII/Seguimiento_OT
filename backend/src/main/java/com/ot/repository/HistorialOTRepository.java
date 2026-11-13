package com.ot.repository;

import com.ot.model.HistorialOT;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistorialOTRepository extends JpaRepository<HistorialOT, Long> {
    List<HistorialOT> findByOrdenTrabajoIdOrderByFechaDesc(Long ordenTrabajoId);
    List<HistorialOT> findByUsuarioIdOrderByFechaDesc(Long usuarioId);

    @Query("SELECT h FROM HistorialOT h WHERE h.ordenTrabajo.id IN " +
           "(SELECT d.ordenTrabajo.id FROM EntregaDetalle d WHERE d.tecnico.id = :tecnicoId) " +
           "ORDER BY h.fecha DESC")
    List<HistorialOT> findByOrdenesDeTecnico(@Param("tecnicoId") Long tecnicoId);
}
