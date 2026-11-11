package com.ot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "historial_ot")
@NoArgsConstructor
@AllArgsConstructor
public class HistorialOT {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "orden_trabajo_id", nullable = false)
    private OrdenTrabajo ordenTrabajo;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "estado_anterior_id")
    private EstadoOT estadoAnterior;

    @ManyToOne
    @JoinColumn(name = "estado_nuevo_id")
    private EstadoOT estadoNuevo;

    @ManyToOne
    @JoinColumn(name = "programacion_detalle_id")
    private ProgramacionDetalle programacionDetalle;

    @ManyToOne
    @JoinColumn(name = "entrega_detalle_id")
    private EntregaDetalle entregaDetalle;

    @Column(name = "accion", nullable = false, length = 100)
    private String accion;

    @Column(name = "fecha", nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    @Column(name = "observacion", columnDefinition = "TEXT")
    private String observacion;
}