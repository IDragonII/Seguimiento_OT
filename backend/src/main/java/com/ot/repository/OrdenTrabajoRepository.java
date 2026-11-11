package com.ot.repository;

import com.ot.model.OrdenTrabajo;
import com.ot.model.EstadoOT;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrdenTrabajoRepository extends JpaRepository<OrdenTrabajo, Long> {
    Optional<OrdenTrabajo> findByTipoOT_IdAndNumeroOT(Long tipoOTId, Integer numeroOT);
    boolean existsByTipoOT_IdAndNumeroOT(Long tipoOTId, Integer numeroOT);

    @Query("SELECT o FROM OrdenTrabajo o WHERE o.estado.nombre = 'PROGRAMADO' " +
           "AND NOT EXISTS (SELECT pd FROM ProgramacionDetalle pd WHERE pd.ordenTrabajo = o)")
    List<OrdenTrabajo> findDisponibles();

    List<OrdenTrabajo> findByEstadoIn(List<EstadoOT> estados);
}