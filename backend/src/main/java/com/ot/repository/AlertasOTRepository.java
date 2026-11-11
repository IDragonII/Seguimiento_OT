package com.ot.repository;

import com.ot.model.AlertasOT;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertasOTRepository extends JpaRepository<AlertasOT, Long> {
    List<AlertasOT> findByEstadoAlertaOrderByFechaGeneracionDesc(String estadoAlerta);
    List<AlertasOT> findByOrdenTrabajoId(Long ordenTrabajoId);
    List<AlertasOT> findAllByOrderByFechaGeneracionDesc();
    List<AlertasOT> findByOrdenTrabajoIdAndEstadoIdAndEstadoAlerta(Long ordenTrabajoId, Long estadoId, String estadoAlerta);
}