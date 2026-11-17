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

    // OTs listas para entregar: el estado PROGRAMADO es el inicial de toda OT creada.
    // No depende de programaciones (esa capa ya no se usa).
    @Query("SELECT o FROM OrdenTrabajo o WHERE o.estado.nombre = 'PROGRAMADO'")
    List<OrdenTrabajo> findDisponibles();

    // OTs devueltas por el técnico: el instalador las programa para ejecución.
    @Query("SELECT o FROM OrdenTrabajo o WHERE o.estado.nombre = 'DEVUELTO' "
        + "ORDER BY o.fechaInicioEstado ASC")
    List<OrdenTrabajo> findDevueltas();

    List<OrdenTrabajo> findByEstadoIn(List<EstadoOT> estados);
}