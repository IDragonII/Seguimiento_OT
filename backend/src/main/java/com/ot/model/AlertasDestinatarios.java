package com.ot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "alertas_destinatarios", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"alerta_id", "usuario_id"}, name = "uq_alerta_usuario")
})
@NoArgsConstructor
@AllArgsConstructor
public class AlertasDestinatarios {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "alerta_id", nullable = false)
    private AlertasOT alerta;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_notificacion")
    private LocalDateTime fechaNotificacion;

    @Column(name = "fecha_lectura")
    private LocalDateTime fechaLectura;

    @Column(name = "fecha_atencion")
    private LocalDateTime fechaAtencion;
}