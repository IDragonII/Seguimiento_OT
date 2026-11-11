package com.ot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "alertas_ot", uniqueConstraints = {
    @UniqueConstraint(columnNames = "historial_id", name = "uq_alerta_historial")
})
@NoArgsConstructor
@AllArgsConstructor
public class AlertasOT {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "orden_trabajo_id", nullable = false)
    private OrdenTrabajo ordenTrabajo;

    @ManyToOne
    @JoinColumn(name = "estado_id", nullable = false)
    private EstadoOT estado;

    @OneToOne
    @JoinColumn(name = "historial_id", nullable = false, unique = true)
    private HistorialOT historial;

    @Column(name = "tipo_alerta", nullable = false, length = 50)
    private String tipoAlerta;

    @Column(name = "fecha_generacion", nullable = false)
    private LocalDateTime fechaGeneracion = LocalDateTime.now();

    @Column(name = "dias_habiles_transcurridos", nullable = false)
    private Integer diasHabilesTranscurridos;

    @Column(name = "dias_habiles_maximos", nullable = false)
    private Integer diasHabilesMaximos;

    @Column(name = "estado_alerta", nullable = false, length = 30)
    private String estadoAlerta = "PENDIENTE";

    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;

    @Column(name = "observacion", columnDefinition = "TEXT")
    private String observacion;
}