package com.ot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "programaciones")
@NoArgsConstructor
@AllArgsConstructor
public class Programacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fecha_programacion", nullable = false)
    private LocalDate fechaProgramacion;

    @ManyToOne
    @JoinColumn(name = "programado_por", nullable = false)
    private Usuario programadoPor;

    @Column(name = "observacion", columnDefinition = "TEXT")
    private String observacion;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();
}