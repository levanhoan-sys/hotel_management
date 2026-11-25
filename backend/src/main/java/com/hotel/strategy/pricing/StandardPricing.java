package com.hotel.strategy.pricing;

import com.hotel.service.PricingRateService;
import org.springframework.stereotype.Component;

@Component("STANDARD")
public class StandardPricing implements PricingStrategy {

    private final PricingRateService rates;

    public StandardPricing(PricingRateService rates) {
        this.rates = rates;
    }

    @Override
    public double computePrice(double basePrice, int numberOfNights) {
        return basePrice * rates.multiplier("STANDARD").doubleValue() * numberOfNights;
    }

    @Override
    public String getStrategyName() {
        return "STANDARD";
    }
}
