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

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "room_types")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RoomType extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    String name;

    @Column(name = "base_price", nullable = false, precision = 15, scale = 2)
    BigDecimal basePrice;

    @Column(nullable = false)
    int capacity;

    @Column(length = 500)
    String description;

    @Column(name = "image_url", length = 1000)
    String imageUrl;

    @Column(name = "area_sqm")
    Double areaSqm;

    @Column(length = 1000)
    String amenities;

    public RoomType(String name, BigDecimal basePrice, int capacity, String description, String imageUrl) {
        this(name, basePrice, capacity, description, imageUrl, null, null);
    }
}

