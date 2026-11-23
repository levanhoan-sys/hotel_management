package com.hotel.strategy.pricing;

import java.math.BigDecimal;

public interface PricingStrategy {
    BigDecimal computePrice(BigDecimal basePrice, int numberOfNights);

    default double computePrice(double basePrice, int numberOfNights) {
        BigDecimal result = computePrice(BigDecimal.valueOf(basePrice), numberOfNights);
        return result != null ? result.doubleValue() : 0.0;
    }

    String getStrategyName();
}

