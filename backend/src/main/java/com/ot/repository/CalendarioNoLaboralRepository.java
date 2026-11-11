package com.ot.repository;

import com.ot.model.CalendarioNoLaboral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CalendarioNoLaboralRepository extends JpaRepository<CalendarioNoLaboral, Long> {
    List<CalendarioNoLaboral> findByFechaBetweenOrderByFecha(LocalDate inicio, LocalDate fin);
    boolean existsByFecha(LocalDate fecha);
}