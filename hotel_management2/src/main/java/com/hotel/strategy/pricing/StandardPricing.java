package com.hotel.strategy.pricing;

import org.springframework.stereotype.Component;
import com.hotel.service.PricingRateService;

@Component("STANDARD")
public class StandardPricing implements PricingStrategy {

    private final PricingRateService rates;
    public StandardPricing(PricingRateService rates) { this.rates = rates; }

    @Override
    public double computePrice(double basePrice, int numberOfNights) {
        return basePrice * rates.multiplier("STANDARD").doubleValue() * numberOfNights;
    }

    @Override
    public String getStrategyName() {
        return "STANDARD";
    }
}
