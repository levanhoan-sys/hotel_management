package com.hotel.strategy.pricing;

import org.springframework.stereotype.Component;

@Component("WEEKEND")
public class WeekendPricing implements PricingStrategy {

    // Phụ thu cuối tuần 20%
    private static final double WEEKEND_SURCHARGE_RATE = 1.20;

    @Override
    public double computePrice(double basePrice, int numberOfNights) {
        return (basePrice * WEEKEND_SURCHARGE_RATE) * numberOfNights;
    }

    @Override
    public String getStrategyName() {
        return "WEEKEND";
    }
}
