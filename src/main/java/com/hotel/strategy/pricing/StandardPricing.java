package com.hotel.strategy.pricing;

import org.springframework.stereotype.Component;
import com.hotel.service.PricingRateService;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Component("STANDARD")
public class StandardPricing implements PricingStrategy {

    private final PricingRateService rates;
    public StandardPricing(PricingRateService rates) { this.rates = rates; }

    @Override
    public BigDecimal computePrice(BigDecimal basePrice, int numberOfNights) {
        if (basePrice == null) return BigDecimal.ZERO;
        return basePrice.multiply(rates.multiplier("STANDARD"))
                .multiply(BigDecimal.valueOf(numberOfNights))
                .setScale(0, RoundingMode.HALF_UP);
    }

    @Override
    public String getStrategyName() {
        return "STANDARD";
    }
}

