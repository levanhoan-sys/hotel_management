package com.hotel.strategy.pricing;

import java.math.BigDecimal;

public interface PricingStrategy {
    BigDecimal computePrice(BigDecimal basePrice, int numberOfNights);

    String getStrategyName();
}

