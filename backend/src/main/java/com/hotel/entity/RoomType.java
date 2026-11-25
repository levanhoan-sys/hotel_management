package com.hotel.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "room_types")
public class RoomType extends BaseEntity {

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(name = "base_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal basePrice = BigDecimal.ZERO;

    @Column(nullable = false)
    private int capacity;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "area_sqm")
    private Integer areaSqm;

    @Column(columnDefinition = "TEXT")
    private String amenities;

    @OneToMany(mappedBy = "roomType", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC, id ASC")
    private List<RoomTypeImage> images = new ArrayList<>();

    public RoomType(String name, double basePrice, int capacity, String description, String imageUrl) {
        this(name, basePrice, capacity, description, imageUrl, null, null);
    }

    public RoomType(String name, double basePrice, int capacity, String description, String imageUrl, Double areaSqm, String amenities) {
        this.name = name;
        this.basePrice = BigDecimal.valueOf(basePrice);
        this.capacity = capacity;
        this.description = description;
        this.imageUrl = imageUrl;
        this.areaSqm = areaSqm == null ? null : (int) Math.round(areaSqm);
        this.amenities = amenities;
    }

    public double getBasePrice() {
        return basePrice == null ? 0.0 : basePrice.doubleValue();
    }

    public void setBasePrice(double basePrice) {
        this.basePrice = BigDecimal.valueOf(basePrice);
    }

    public Double getAreaSqm() {
        return areaSqm == null ? null : areaSqm.doubleValue();
    }

    public void setAreaSqm(Double areaSqm) {
        this.areaSqm = areaSqm == null ? null : (int) Math.round(areaSqm);
    }

    public List<String> getImageUrls() {
        if (images != null && !images.isEmpty()) {
            return images.stream()
                    .map(RoomTypeImage::getImageUrl)
                    .filter(u -> u != null && !u.isBlank())
                    .toList();
        }
        return (imageUrl != null && !imageUrl.isBlank()) ? List.of(imageUrl) : List.of();
    }

    public void replaceImages(List<String> rawUrls, String fallbackImageUrl) {
        Set<String> unique = new LinkedHashSet<>();
        if (fallbackImageUrl != null && !fallbackImageUrl.isBlank() && (rawUrls == null || rawUrls.isEmpty())) {
            unique.add(fallbackImageUrl.trim());
        }
        if (rawUrls != null) {
            for (String url : rawUrls) {
                if (url != null && !url.isBlank()) {
                    unique.add(url.trim());
                }
            }
        }
        this.images.clear();
        int order = 1;
        for (String url : unique) {
            this.images.add(new RoomTypeImage(this, url, null, order++));
        }
        if (fallbackImageUrl != null && !fallbackImageUrl.isBlank()) {
            this.imageUrl = fallbackImageUrl.trim();
        } else if (!unique.isEmpty()) {
            this.imageUrl = unique.iterator().next();
        } else {
            this.imageUrl = null;
        }
    }
}
