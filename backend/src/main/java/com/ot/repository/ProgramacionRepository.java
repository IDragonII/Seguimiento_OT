package com.ot.repository;

import com.ot.model.Programacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ProgramacionRepository extends JpaRepository<Programacion, Long> {
    List<Programacion> findByFechaProgramacionOrderByFechaProgramacionDesc(LocalDate fecha);
    List<Programacion> findAllByOrderByFechaProgramacionDesc();
}