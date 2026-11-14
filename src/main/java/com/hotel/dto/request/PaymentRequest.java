package com.hotel.dto.request;

import com.hotel.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PaymentRequest(
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull PaymentMethod method,
        @NotBlank @Size(max = 100) String idempotencyKey,
        @Size(max = 255) String reference) { }
