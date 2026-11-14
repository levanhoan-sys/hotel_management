package com.hotel.strategy.pricing;

import org.springframework.stereotype.Component;

@Component("STANDARD")
public class StandardPricing implements PricingStrategy {

    @Override
    public double computePrice(double basePrice, int numberOfNights) {
        return basePrice * numberOfNights;
    }

    @Override
    public String getStrategyName() {
        return "STANDARD";
    }
}
