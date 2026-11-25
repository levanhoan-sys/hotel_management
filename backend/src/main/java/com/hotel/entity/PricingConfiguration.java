package com.hotel.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "pricing_configurations", uniqueConstraints = @UniqueConstraint(name = "uk_pricing_strategy", columnNames = "strategy"))
public class PricingConfiguration extends BaseEntity {
    @Column(name = "strategy", nullable = false, length = 30)
    private String strategy;

    @Column(name = "multiplier", nullable = false, precision = 8, scale = 4)
    private BigDecimal multiplier;

    @Column(name = "default_multiplier", nullable = false, precision = 8, scale = 4)
    private BigDecimal defaultMultiplier;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PricingConfiguration(String strategy, BigDecimal multiplier) {
        this(strategy, multiplier, multiplier);
    }

    public PricingConfiguration(String strategy, BigDecimal multiplier, BigDecimal defaultMultiplier) {
        this.strategy = strategy;
        this.multiplier = multiplier;
        this.defaultMultiplier = defaultMultiplier;
    }

    public String getStrategyName() {
        return strategy;
    }

    public void setStrategyName(String strategyName) {
        this.strategy = strategyName;
    }
}
