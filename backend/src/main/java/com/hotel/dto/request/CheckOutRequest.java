package com.hotel.dto.request;

import com.hotel.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CheckOutRequest {

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    @DecimalMin(value = "0.0", message = "Discount cannot be negative")
    private BigDecimal discount = BigDecimal.ZERO;

    @DecimalMin(value = "0.00", message = "Surcharge cannot be negative")
    private BigDecimal surcharge = BigDecimal.ZERO;

    @Size(max = 100)
    private String idempotencyKey;
}
