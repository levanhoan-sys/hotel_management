package com.hotel.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record RoomTypeRequest(
        @NotBlank @Size(max = 50) String name,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal basePrice,
        @Min(1) int capacity,
        @Size(max = 500) String description,
        @Size(max = 1000) String imageUrl,
        @DecimalMin("0.1") Double areaSqm,
        @Size(max = 1000) String amenities) { }

