package com.hotel.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "service_items")
public class ServiceItem extends BaseEntity {

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(length = 20)
    private String unit;

    @ColumnDefault("true")
    @Column(name = "active", nullable = false)
    private boolean active = true;

    public ServiceItem(String name, BigDecimal unitPrice, String unit) {
        this(name, unitPrice, unit, true);
    }

    public ServiceItem(String name, double unitPrice, String unit, boolean active) {
        this(name, BigDecimal.valueOf(unitPrice), unit, active);
    }

    public ServiceItem(String name, double unitPrice, String unit) {
        this(name, BigDecimal.valueOf(unitPrice), unit, true);
    }

    public double getUnitPriceDouble() {
        return unitPrice != null ? unitPrice.doubleValue() : 0.0;
    }
}

