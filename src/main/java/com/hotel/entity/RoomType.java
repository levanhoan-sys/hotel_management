package com.hotel.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "room_types")
public class RoomType extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(name = "base_price", nullable = false)
    private double basePrice;

    @Column(nullable = false)
    private int capacity;

    @Column(length = 500)
    private String description;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "area_sqm")
    private Double areaSqm;

    @Column(length = 1000)
    private String amenities;

    public RoomType(String name, double basePrice, int capacity, String description, String imageUrl) {
        this(name, basePrice, capacity, description, imageUrl, null, null);
    }
}
