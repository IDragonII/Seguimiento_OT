package com.ot.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ot.model.AlertasDestinatarios;
import org.springframework.data.jpa.repository.JpaRepository;

@Repository
public interface AlertasDestinatariosRepository extends JpaRepository<AlertasDestinatarios, Long> {
    List<AlertasDestinatarios> findByUsuarioIdAndFechaLecturaIsNull(Long usuarioId);
    List<AlertasDestinatarios> findByAlertaId(Long alertaId);
    AlertasDestinatarios findByUsuarioIdAndAlertaId(Long usuarioId, Long alertaId);
    
    @Modifying
    @Query("UPDATE AlertasDestinatarios d SET d.fechaLectura = :fecha WHERE d.id = :id")
    int setFechaLecturaById(@Param("fecha") LocalDateTime fecha, @Param("id") Long id);
    
    @Query("SELECT d FROM AlertasDestinatarios d WHERE d.usuario.id = :usuarioId AND d.alerta.estadoAlerta IN ('PENDIENTE') AND d.fechaLectura IS NULL")
    List<AlertasDestinatarios> findByUsuarioIdAndEstadoYFechaLecturaIsNull(@Param("usuarioId") Long usuarioId);
}