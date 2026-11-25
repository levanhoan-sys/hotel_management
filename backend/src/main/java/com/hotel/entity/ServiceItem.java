package com.hotel.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "service_items")
public class ServiceItem extends BaseEntity {

    @Column(nullable = false, unique = true, length = 150)
    private String name;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(nullable = false, length = 50)
    private String unit;

    @ColumnDefault("true")
    @Column(name = "active", nullable = false)
    private boolean active = true;

    public ServiceItem(String name, double unitPrice, String unit, boolean active) {
        this.name = name;
        this.unitPrice = BigDecimal.valueOf(unitPrice);
        this.unit = unit;
        this.active = active;
    }

    public double getUnitPrice() {
        return unitPrice == null ? 0.0 : unitPrice.doubleValue();
    }

    public void setUnitPrice(double unitPrice) {
        this.unitPrice = BigDecimal.valueOf(unitPrice);
    }
}
