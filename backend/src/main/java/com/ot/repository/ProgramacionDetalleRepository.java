package com.ot.repository;

import com.ot.model.ProgramacionDetalle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProgramacionDetalleRepository extends JpaRepository<ProgramacionDetalle, Long> {
    List<ProgramacionDetalle> findByProgramacionId(Long programacionId);
    boolean existsByProgramacionIdAndOrdenTrabajoId(Long programacionId, Long ordenTrabajoId);

    @Query("SELECT pd.ordenTrabajo.id, MIN(p.fechaProgramacion) FROM ProgramacionDetalle pd "
         + "JOIN pd.programacion p WHERE pd.ordenTrabajo.id IN :ordenIds GROUP BY pd.ordenTrabajo.id")
    List<Object[]> minFechaProgramacionPorOrdenes(@Param("ordenIds") List<Long> ordenIds);
}