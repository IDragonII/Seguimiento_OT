package com.ot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "ordenes_trabajo", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tipo_ot_id", "numero_ot"}, name = "uq_tipo_numero_ot")
})
@NoArgsConstructor
@AllArgsConstructor
public class OrdenTrabajo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "tipo_ot_id", nullable = false)
    private TipoOT tipoOT;

    @Column(name = "numero_ot", nullable = false)
    private Integer numeroOT;

    @ManyToOne
    @JoinColumn(name = "estado_id", nullable = false)
    private EstadoOT estado;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "ubicacion", length = 120)
    private String ubicacion;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    @Column(name = "fecha_inicio_estado", nullable = false)
    private LocalDateTime fechaInicioEstado = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "registrado_por", nullable = false)
    private Usuario registradoPor;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.fechaActualizacion = LocalDateTime.now();
    }
}