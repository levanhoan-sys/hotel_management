package com.hotel.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "service_items")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ServiceItem extends BaseEntity {

    @Column(nullable = false, unique = true, length = 100)
    String name;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    BigDecimal unitPrice;

    @Column(length = 20)
    String unit;

    @ColumnDefault("true")
    @Column(name = "active", nullable = false)
    boolean active = true;

    public ServiceItem(String name, BigDecimal unitPrice, String unit) {
        this(name, unitPrice, unit, true);
    }
}

