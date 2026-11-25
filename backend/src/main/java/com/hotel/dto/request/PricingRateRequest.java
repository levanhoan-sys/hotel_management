package com.hotel.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PricingRateRequest(@NotNull @DecimalMin("0.10") @DecimalMax("10.00") BigDecimal multiplier) { }
