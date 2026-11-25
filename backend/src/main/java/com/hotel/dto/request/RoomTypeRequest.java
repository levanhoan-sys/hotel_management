package com.hotel.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RoomTypeRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) Double basePrice,
        @Min(1) int capacity,
        @Size(max = 2000) String description,
        @Size(max = 500) String imageUrl,
        @DecimalMin("0.1") Double areaSqm,
        @Size(max = 2000) String amenities,
        List<@Size(max = 500) String> imageUrls) {

    public RoomTypeRequest(String name, Double basePrice, int capacity, String description,
                           String imageUrl, Double areaSqm, String amenities) {
        this(name, basePrice, capacity, description, imageUrl, areaSqm, amenities, null);
    }
}
