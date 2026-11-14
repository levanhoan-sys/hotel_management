package com.hotel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "refunds", uniqueConstraints = @UniqueConstraint(columnNames = "booking_id"))
public class Refund extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;
    @Column(name = "refund_code", nullable = false, unique = true, length = 40)
    private String code;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;
    @Column(nullable = false, length = 20)
    private String status = "PENDING";
    @Column(name = "completed_at")
    private Instant completedAt;
    @Column(name = "processing_reference", length = 100)
    private String processingReference;

    public Refund(Booking booking, BigDecimal amount) {
        this.booking = booking;
        this.amount = amount;
        this.code = "RF-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    public void complete(String reference) {
        if (!"PENDING".equals(status)) throw new IllegalStateException("Refund has already been processed");
        status = "COMPLETED";
        processingReference = reference;
        completedAt = Instant.now();
    }
}
