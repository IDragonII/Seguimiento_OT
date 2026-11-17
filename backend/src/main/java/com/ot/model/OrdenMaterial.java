package com.ot.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Entity
@Table(name = "orden_materiales", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"orden_trabajo_id", "material_id"}, name = "uq_orden_material")
})
@NoArgsConstructor
@AllArgsConstructor
public class OrdenMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "orden_trabajo_id", nullable = false)
    @JsonIgnore
    private OrdenTrabajo ordenTrabajo;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;

    @Column(name = "cantidad", nullable = false, precision = 12, scale = 2)
    private BigDecimal cantidad;
}
