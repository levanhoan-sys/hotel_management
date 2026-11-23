package com.hotel.strategy.pricing;

import org.springframework.stereotype.Component;
import com.hotel.service.PricingRateService;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Component("WEEKEND")
public class WeekendPricing implements PricingStrategy {

    private final PricingRateService rates;
    public WeekendPricing(PricingRateService rates) { this.rates = rates; }

    @Override
    public BigDecimal computePrice(BigDecimal basePrice, int numberOfNights) {
        if (basePrice == null) return BigDecimal.ZERO;
        return basePrice.multiply(rates.multiplier("WEEKEND"))
                .multiply(BigDecimal.valueOf(numberOfNights))
                .setScale(0, RoundingMode.HALF_UP);
    }

    @Override
    public String getStrategyName() {
        return "WEEKEND";
    }
}

