package com.ot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "configuracion_tiempos_ot", uniqueConstraints = {
    @UniqueConstraint(columnNames = "estado_id", name = "uq_config_estado")
})
@NoArgsConstructor
@AllArgsConstructor
public class ConfiguracionTiemposOT {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "estado_id", nullable = false, unique = true)
    private EstadoOT estado;

    @Column(name = "dias_habiles_maximos", nullable = false)
    private Integer diasHabilesMaximos;

    @Column(name = "activo", nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean activo = true;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion = LocalDateTime.now();
}