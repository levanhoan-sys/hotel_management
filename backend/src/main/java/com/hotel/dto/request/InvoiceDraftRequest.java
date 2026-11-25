package com.hotel.dto.request;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;

public record InvoiceDraftRequest(
        @DecimalMin(value = "0.00") BigDecimal surcharge,
        @DecimalMin(value = "0.00") BigDecimal discount) { }
