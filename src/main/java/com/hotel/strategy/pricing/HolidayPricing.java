package com.hotel.strategy.pricing;

import org.springframework.stereotype.Component;

@Component("HOLIDAY")
public class HolidayPricing implements PricingStrategy {

    // Phụ thu dịp lễ Tết 50%
    private static final double HOLIDAY_SURCHARGE_RATE = 1.50;

    @Override
    public double computePrice(double basePrice, int numberOfNights) {
        return (basePrice * HOLIDAY_SURCHARGE_RATE) * numberOfNights;
    }

    @Override
    public String getStrategyName() {
        return "HOLIDAY";
    }
}
