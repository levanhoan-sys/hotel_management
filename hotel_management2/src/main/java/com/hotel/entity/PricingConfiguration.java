package com.hotel.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
@Entity
@Table(name = "pricing_configurations", uniqueConstraints = @UniqueConstraint(columnNames = "strategy_name"))
public class PricingConfiguration extends BaseEntity {
    @Column(name = "strategy_name", nullable = false, length = 20)
    private String strategyName;

    @Column(name = "multiplier", nullable = false, precision = 5, scale = 2)
    private BigDecimal multiplier;

    public PricingConfiguration(String strategyName, BigDecimal multiplier) {
        this.strategyName = strategyName;
        this.multiplier = multiplier;
    }
}
