package com.ot.repository;

import com.ot.model.EntregaDetalle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EntregaDetalleRepository extends JpaRepository<EntregaDetalle, Long> {
    List<EntregaDetalle> findByEntregaId(Long entregaId);
    List<EntregaDetalle> findByEntregaIdIn(List<Long> entregaIds);
    List<EntregaDetalle> findByTecnicoId(Long tecnicoId);
    List<EntregaDetalle> findByFechaDevolucionIsNull();
    Optional<EntregaDetalle> findByOrdenTrabajoIdAndFechaDevolucionIsNull(Long ordenTrabajoId);
    boolean existsByOrdenTrabajoIdAndFechaDevolucionIsNull(Long ordenTrabajoId);
    boolean existsByProgramacionDetalleId(Long programacionDetalleId);
    List<EntregaDetalle> findByOrdenTrabajoId(Long ordenTrabajoId);

    // Batch: en vez de existsByProgramacionDetalleId por cada detalle (N+1).
    @Query("SELECT DISTINCT d.programacionDetalle.id FROM EntregaDetalle d "
         + "WHERE d.programacionDetalle.id IN :ids")
    List<Long> findProgramacionDetalleIdsConEntrega(@Param("ids") List<Long> ids);

    // /entregas/tecnicos: sin findAll() de la tabla entera + filtro en memoria.
    @Query("SELECT d FROM EntregaDetalle d JOIN FETCH d.tecnico JOIN FETCH d.ordenTrabajo "
         + "WHERE d.tecnico IS NOT NULL")
    List<EntregaDetalle> findAllConTecnico();

    // Bandeja del técnico ordenada por fecha de entrega (más reciente primero).
    List<EntregaDetalle> findByTecnicoIdOrderByFechaCreacionDesc(Long tecnicoId);

    // Último técnico que tuvo una OT (fallback de "responsable" en /buscar).
    List<EntregaDetalle> findByOrdenTrabajoIdOrderByFechaCreacionDesc(Long ordenTrabajoId);
}