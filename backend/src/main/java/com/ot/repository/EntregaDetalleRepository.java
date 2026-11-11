package com.ot.repository;

import com.ot.model.EntregaDetalle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EntregaDetalleRepository extends JpaRepository<EntregaDetalle, Long> {
    List<EntregaDetalle> findByEntregaId(Long entregaId);
    List<EntregaDetalle> findByTecnicoId(Long tecnicoId);
    List<EntregaDetalle> findByFechaDevolucionIsNull();
    Optional<EntregaDetalle> findByOrdenTrabajoIdAndFechaDevolucionIsNull(Long ordenTrabajoId);
    boolean existsByOrdenTrabajoIdAndFechaDevolucionIsNull(Long ordenTrabajoId);
    boolean existsByProgramacionDetalleId(Long programacionDetalleId);
    List<EntregaDetalle> findByOrdenTrabajoId(Long ordenTrabajoId);
}