package com.hotel.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ServiceItemRequest(@NotBlank @Size(max = 100) String name,
                                 @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal unitPrice,
                                 @Size(max = 20) String unit) {
    public ServiceItemRequest(String name, Double unitPrice, String unit) {
        this(name, unitPrice != null ? BigDecimal.valueOf(unitPrice) : null, unit);
    }
}

